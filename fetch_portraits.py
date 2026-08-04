#!/usr/bin/env python3
"""Fetch justice portraits from Wikipedia into the site's static assets.

RUN THIS LOCALLY from the repository root:

    pip install requests beautifulsoup4
    python fetch_portraits.py

What it does:
  1. Downloads Wikipedia's "List of justices of the Supreme Court of the
     United States" and parses each table row for a portrait thumbnail,
     the justice's article link, and their tenure dates.
  2. Matches each justice in scildb-site/public/data/justices.json to a row
     by surname plus nearest start year (this is what keeps the two John
     Harlans, three Jacksons, two Whites, and so on from swapping faces).
  3. Downloads a 256px thumbnail per justice into
     scildb-site/public/assets/justices/ and writes a manifest to
     scildb-site/public/data/portraits.json recording each image's source
     article, so the site can credit Wikimedia Commons.

Re-run it any time; existing images are kept unless you pass --force.
Review the match report it prints — any justice listed as UNMATCHED can be
fixed by adding an entry to OVERRIDES below and re-running.
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

LIST_URL = "https://en.wikipedia.org/wiki/List_of_justices_of_the_Supreme_Court_of_the_United_States"
REPO_ROOT = Path(__file__).resolve().parent
JUSTICES_JSON = REPO_ROOT / "scildb-site" / "public" / "data" / "justices.json"
MANIFEST_JSON = REPO_ROOT / "scildb-site" / "public" / "data" / "portraits.json"
ASSETS_DIR = REPO_ROOT / "scildb-site" / "public" / "assets" / "justices"
THUMB_WIDTH = 256
USER_AGENT = "SCILDB-portrait-fetcher/1.0 (https://github.com/caslaskowski/SCILDB; academic research project)"

# Manual fixes: justiceName -> direct image URL (any size; it will be used
# as-is). Fill this in if the match report flags a justice, then re-run.
OVERRIDES: dict[str, str] = {}

VALID_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}


def fetch(session: requests.Session, url: str) -> requests.Response:
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp


def parse_wiki_rows(html: str) -> list[dict]:
    """Extract (surname, start-year guess, image URL, article URL) per table row."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_="wikitable")
    if not tables:
        sys.exit("Could not find any wikitable on the page — has the page layout changed?")
    # The justices table is by far the largest one on the page.
    table = max(tables, key=lambda t: len(t.find_all("tr")))

    rows = []
    for tr in table.find_all("tr"):
        img = tr.find("img")
        if img is None or not img.get("src"):
            continue  # header rows and rows without portraits
        src = img["src"]
        if src.startswith("//"):
            src = "https:" + src

        # The justice's article link: first /wiki/ link that isn't a File:,
        # Help:, or other namespaced page. The image's own File: link has a
        # colon in its title, so this skips it naturally.
        article, display = None, None
        for a in tr.find_all("a"):
            href = a.get("href", "")
            text = a.get_text(strip=True)
            if href.startswith("/wiki/") and ":" not in href[len("/wiki/"):] and text:
                article = "https://en.wikipedia.org" + href
                display = text
                break
        if not article or not display:
            continue

        # Start-year guess: the earliest "Month D, YYYY" date in the row.
        # Birth–death years render as bare "(1745–1829)" so they don't match.
        years = [int(y) for y in re.findall(r"[A-Z][a-z]+ \d{1,2}, (\d{4})", tr.get_text(" "))]
        rows.append(
            {
                "surname": display.split()[-1].lower(),
                "year": min(years) if years else None,
                "img": src,
                "article": article,
                "display": display,
            }
        )
    return rows


def thumb_url(src: str, width: int) -> str:
    """Rewrite a Commons thumbnail URL to the requested width."""
    return re.sub(r"/\d+px-", f"/{width}px-", src)


def file_ext(url: str) -> str:
    ext = url.split("?")[0].rsplit(".", 1)[-1].lower()
    return ext if ext in VALID_EXTS else "jpg"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-download images that already exist")
    parser.add_argument(
        "--hotlink",
        action="store_true",
        help="don't download images; write remote Wikimedia URLs into portraits.json instead "
        "(self-hosting is recommended: it is faster, more reliable, and kinder to Wikimedia)",
    )
    args = parser.parse_args()

    justices = json.loads(JUSTICES_JSON.read_text())
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    print(f"Fetching {LIST_URL} …")
    rows = parse_wiki_rows(fetch(session, LIST_URL).text)
    print(f"Parsed {len(rows)} portrait rows from the Wikipedia table.\n")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    unmatched: list[str] = []

    for j in justices:
        name = j["justiceName"]
        full = j["fullName"]
        surname = full.split()[-1].lower()
        start = j.get("startYear")

        if name in OVERRIDES:
            img_url, article, note = OVERRIDES[name], LIST_URL, "override"
        else:
            candidates = [r for r in rows if r["surname"] == surname]
            if not candidates:
                unmatched.append(f"{name} ({full}, {start}) — no surname match")
                continue
            best = min(
                candidates,
                key=lambda r: abs(r["year"] - start) if (r["year"] and start) else 99,
            )
            gap = abs(best["year"] - start) if (best["year"] and start) else None
            if gap is not None and gap > 3:
                unmatched.append(
                    f"{name} ({full}, {start}) — nearest is {best['display']} ({best['year']}), gap {gap}y"
                )
                continue
            img_url = thumb_url(best["img"], THUMB_WIDTH)
            article = best["article"]
            note = f"matched {best['display']} ({best['year']})"

        if args.hotlink:
            manifest[name] = {"url": img_url, "source": article}
            print(f"  {name:14} {'hotlinked':14} {note}")
            continue

        fname = f"{name}.{file_ext(img_url)}"
        dest = ASSETS_DIR / fname
        if dest.exists() and not args.force:
            status = "kept existing"
        else:
            try:
                dest.write_bytes(fetch(session, img_url).content)
                status = "downloaded"
                time.sleep(0.3)  # be polite to Wikimedia's servers
            except requests.RequestException as e:
                unmatched.append(f"{name} ({full}) — download failed: {e}")
                continue
        manifest[name] = {"file": fname, "source": article}
        print(f"  {name:14} {status:14} {note}")

    MANIFEST_JSON.write_text(json.dumps(manifest, indent=1))
    print(f"\nWrote {len(manifest)} entries to {MANIFEST_JSON.relative_to(REPO_ROOT)}")
    print(f"Images in {ASSETS_DIR.relative_to(REPO_ROOT)}")
    if unmatched:
        print(f"\nNEEDS ATTENTION — {len(unmatched)} justice(s) without a portrait:")
        for line in unmatched:
            print(f"  UNMATCHED: {line}")
        print("Fix these by adding an image URL to OVERRIDES at the top of this script, then re-run.")
    else:
        print("\nAll justices matched. Commit the new images and portraits.json, then push.")


if __name__ == "__main__":
    main()
