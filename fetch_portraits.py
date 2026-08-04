#!/usr/bin/env python3
"""Fetch justice portraits from Wikipedia into the site's static assets.

RUN THIS LOCALLY from the repository root:

    pip install requests beautifulsoup4
    python fetch_portraits.py             # download images (recommended)
    python fetch_portraits.py --hotlink   # write remote URLs instead

What it does:
  1. Downloads Wikipedia's "List of justices of the Supreme Court of the
     United States" and parses every table row for a portrait thumbnail,
     the justice's article link, and their tenure dates.
  2. Matches each justice in scildb-site/public/data/justices.json to a row
     by surname plus nearest start year (this is what keeps the two John
     Harlans, three Jacksons, two Whites, and so on from swapping faces).
  3. For any justice the table doesn't yield, falls back to the MediaWiki
     API: search for the justice's article and take its lead image.
  4. Downloads a 256px thumbnail per justice into
     scildb-site/public/assets/justices/ and writes a manifest to
     scildb-site/public/data/portraits.json recording each image's source,
     so the site can credit Wikimedia Commons.

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
API_URL = "https://en.wikipedia.org/w/api.php"
REPO_ROOT = Path(__file__).resolve().parent
JUSTICES_JSON = REPO_ROOT / "scildb-site" / "public" / "data" / "justices.json"
MANIFEST_JSON = REPO_ROOT / "scildb-site" / "public" / "data" / "portraits.json"
ASSETS_DIR = REPO_ROOT / "scildb-site" / "public" / "assets" / "justices"
# Wikimedia now only renders thumbnails at preset widths (see
# https://w.wiki/GHai); arbitrary sizes like 256 return HTTP 400. 250 is on
# the permitted list and plenty for our largest display size (56px @2x).
THUMB_WIDTH = 250
USER_AGENT = "SCILDB-portrait-fetcher/1.0 (https://github.com/caslaskowski/SCILDB; academic research project)"

# Manual fixes: justiceName -> direct image URL (any size; it will be used
# as-is). Fill this in if the match report flags a justice, then re-run.
OVERRIDES: dict[str, str] = {}

VALID_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}

# Matches both relative (/wiki/John_Jay) and absolute
# (https://en.wikipedia.org/wiki/John_Jay) article links. Wikipedia's newer
# Parsoid renderer emits absolute URLs, the classic renderer relative ones.
WIKI_LINK = re.compile(r"^(?:https?://en\.(?:m\.)?wikipedia\.org)?/wiki/([^#?]+)$")

# "Oliver Wendell Holmes Jr." should match on "holmes", not "jr."
GENERATIONAL_SUFFIXES = {"jr", "sr", "ii", "iii", "iv"}


def surname_of(name: str) -> str:
    parts = [p for p in re.sub(r"[.,]", "", name).split() if p.lower() not in GENERATIONAL_SUFFIXES]
    return parts[-1].lower() if parts else ""


def fetch(session: requests.Session, url: str, **kwargs) -> requests.Response:
    resp = session.get(url, timeout=30, **kwargs)
    resp.raise_for_status()
    return resp


def parse_wiki_rows(html: str) -> list[dict]:
    """Extract (surname, start-year guess, image URL, article URL) from every
    wikitable row on the page that has both a portrait and an article link.

    We deliberately scan ALL wikitables rather than trying to identify "the"
    justices table: Wikipedia sometimes splits or restructures the list, and
    rows from unrelated tables are harmless — the surname + start-year
    matcher simply never picks them.
    """
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for table in soup.find_all("table", class_="wikitable"):
        for tr in table.find_all("tr"):
            img = tr.find("img")
            if img is None:
                continue  # header rows and rows without portraits
            # Tolerate lazy-loaded images: the real URL may be in data-src
            # while src holds only a placeholder. Take whichever attribute
            # actually points at Wikimedia.
            src = next(
                (u for u in (img.get("src"), img.get("data-src")) if u and "upload.wikimedia.org" in u),
                None,
            )
            if not src:
                continue
            if src.startswith("//"):
                src = "https:" + src

            # The justice's article link: first wiki link (relative or
            # absolute) whose title has no namespace colon. The image's own
            # File: link has one, so this skips it naturally.
            article, display = None, None
            for a in tr.find_all("a"):
                m = WIKI_LINK.match(a.get("href", ""))
                text = a.get_text(strip=True)
                if m and ":" not in m.group(1) and text:
                    article = "https://en.wikipedia.org/wiki/" + m.group(1)
                    display = text
                    break
            if not article or not display:
                continue

            # Start-year guess: the earliest "Month D, YYYY" date in the row.
            # Birth–death years render as bare "(1745–1829)" so don't match.
            years = [int(y) for y in re.findall(r"[A-Z][a-z]+ \d{1,2}, (\d{4})", tr.get_text(" "))]
            rows.append(
                {
                    "surname": surname_of(display),
                    "year": min(years) if years else None,
                    "img": src,
                    "article": article,
                    "display": display,
                }
            )
    return rows


def api_portrait(session: requests.Session, full_name: str) -> tuple[str, str, str] | None:
    """Fallback: search the MediaWiki API for the justice's article and return
    (thumbnail URL, article URL, matched title) from its lead image."""
    try:
        resp = fetch(
            session,
            API_URL,
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f"{full_name} Supreme Court justice",
                "gsrlimit": 1,
                "prop": "pageimages|info",
                "inprop": "url",
                "pithumbsize": THUMB_WIDTH,
            },
        ).json()
    except (requests.RequestException, ValueError):
        return None
    for page in (resp.get("query") or {}).get("pages", {}).values():
        thumb = (page.get("thumbnail") or {}).get("source")
        if thumb:
            return thumb, page.get("fullurl") or LIST_URL, page.get("title", full_name)
    return None


def thumb_url(src: str, width: int) -> str:
    """Rewrite a Commons thumbnail URL to the requested width."""
    return re.sub(r"/\d+px-", f"/{width}px-", src)


def file_ext(url: str) -> str:
    ext = url.split("?")[0].rsplit(".", 1)[-1].lower()
    return ext if ext in VALID_EXTS else "jpg"


def match_from_table(rows: list[dict], surname: str, start: int | None) -> tuple[dict, int | None] | None:
    """Best table row for a surname + start year, or None if nothing plausible."""
    candidates = [r for r in rows if r["surname"] == surname]
    if not candidates:
        return None
    best = min(candidates, key=lambda r: abs(r["year"] - start) if (r["year"] and start) else 99)
    gap = abs(best["year"] - start) if (best["year"] and start) else None
    if gap is not None and gap > 3:
        return None
    return best, gap


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-download images that already exist")
    parser.add_argument(
        "--hotlink",
        action="store_true",
        help="don't download images; write remote Wikimedia URLs into portraits.json instead "
        "(self-hosting is recommended: it is faster, more reliable, and kinder to Wikimedia)",
    )
    parser.add_argument(
        "--html",
        type=Path,
        help="parse a locally saved copy of the list page instead of fetching it (debugging aid)",
    )
    args = parser.parse_args()

    justices = json.loads(JUSTICES_JSON.read_text())
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    if args.html:
        print(f"Parsing local file {args.html} …")
        page_html = args.html.read_text(encoding="utf-8", errors="replace")
    else:
        print(f"Fetching {LIST_URL} …")
        page_html = fetch(session, LIST_URL).text
    rows = parse_wiki_rows(page_html)
    print(f"Parsed {len(rows)} portrait rows from the page's tables.\n")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    unmatched: list[str] = []
    from_table = from_api = 0

    for j in justices:
        name = j["justiceName"]
        full = j["fullName"]
        surname = surname_of(full)
        start = j.get("startYear")

        if name in OVERRIDES:
            img_url, article, note = OVERRIDES[name], LIST_URL, "override"
            fallback_url = None
        else:
            table_match = match_from_table(rows, surname, start)
            if table_match:
                best, _gap = table_match
                img_url = thumb_url(best["img"], THUMB_WIDTH)
                # If Wikimedia ever rejects our size, the page's own thumbnail
                # URL is guaranteed renderable — keep it as a fallback.
                fallback_url = best["img"]
                article = best["article"]
                note = f"table: {best['display']} ({best['year']})"
                from_table += 1
            else:
                api_match = api_portrait(session, full)
                time.sleep(0.3)
                if api_match is None:
                    unmatched.append(f"{name} ({full}, {start}) — not in table, API found no image")
                    continue
                img_url, article, title = api_match
                fallback_url = None
                note = f"API: {title}"
                from_api += 1

        if args.hotlink:
            manifest[name] = {"url": img_url, "source": article}
            print(f"  {name:14} {'hotlinked':14} {note}")
            continue

        fname = f"{name}.{file_ext(img_url)}"
        dest = ASSETS_DIR / fname
        if dest.exists() and not args.force:
            status = "kept existing"
        else:
            status, last_error = None, None
            attempts = [img_url] + ([fallback_url] if fallback_url and fallback_url != img_url else [])
            for attempt, url in enumerate(attempts):
                try:
                    dest.write_bytes(fetch(session, url).content)
                    status = "downloaded" if attempt == 0 else "downloaded (fallback size)"
                    time.sleep(0.3)  # be polite to Wikimedia's servers
                    break
                except requests.RequestException as e:
                    last_error = e
            if status is None:
                unmatched.append(f"{name} ({full}) — download failed: {last_error}")
                continue
        manifest[name] = {"file": fname, "source": article}
        print(f"  {name:14} {status:14} {note}")

    MANIFEST_JSON.write_text(json.dumps(manifest, indent=1))
    print(f"\nWrote {len(manifest)} entries to {MANIFEST_JSON.relative_to(REPO_ROOT)}")
    print(f"Matched from list-page tables: {from_table} · from MediaWiki API fallback: {from_api}")
    print(f"Images in {ASSETS_DIR.relative_to(REPO_ROOT)}")
    if unmatched:
        print(f"\nNEEDS ATTENTION — {len(unmatched)} justice(s) without a portrait:")
        for line in unmatched:
            print(f"  UNMATCHED: {line}")
        print("Fix these by adding an image URL to OVERRIDES at the top of this script, then re-run.")
    else:
        print("\nAll justices matched. IMPORTANT: skim the 'API:' lines above to confirm each")
        print("matched article is the right person, then commit the images and portraits.json.")


if __name__ == "__main__":
    sys.exit(main())
