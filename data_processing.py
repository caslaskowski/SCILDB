import pandas as pd
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import os
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get the absolute path of the directory where the script is located
file_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(file_dir)


# ── Sessions & Caching ─────────────────────────────────────────────────────────
# Variables for API pulls — must be set before session creation
auth_token = os.environ.get('CL_AUTH_TOKEN')
if not auth_token:
    logger.error("CL_AUTH_TOKEN environment variable not set")
    raise SystemExit(1)

cl_url = "https://www.courtlistener.com"
api_url = 'https://www.courtlistener.com/api/rest/v4/clusters/'

# CourtListener session — reuses TCP connections and carries the auth header [2]
cl_session = requests.Session()
cl_session.headers.update({'Authorization': auth_token})

# Retry strategy: back off on server errors and rate-limit responses [2]
cl_retry = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
cl_adapter = HTTPAdapter(
    max_retries=cl_retry,
    pool_connections=10,
    pool_maxsize=20
)
cl_session.mount('https://', cl_adapter)

# Internet Archive session — separate host, separate pool [2]
ia_session = requests.Session()
ia_retry = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[429, 500, 503]
)
ia_adapter = HTTPAdapter(max_retries=ia_retry)
ia_session.mount('https://', ia_adapter)

# Simple dictionary cache so the same URL is never fetched twice [6]
_api_cache: dict[str, dict | list | None] = {}


def pull_with_url_cached(url: str):
    """Fetch a CourtListener URL, returning a cached result when available."""
    if url in _api_cache:
        return _api_cache[url]
    result = pull_with_url(url)
    if result is not None:        # don't cache failures
        _api_cache[url] = result
    return result


# ── DataFrame helper functions (unchanged) ──────────────────────────────────────

def merge_dataframes(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    logger.info(f"Merging DataFrames: {len(df1)} rows + {len(df2)} rows")
    combined_df = pd.concat([df1, df2], ignore_index=True)
    combined_df = combined_df.drop_duplicates()
    logger.info(f"Result: {len(combined_df)} rows after removing duplicates")
    return combined_df


def left_join(left_df: pd.DataFrame,
              right_df: pd.DataFrame,
              left_on: str,
              right_on: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    logger.info(f"Performing left join on {left_on} (left) -> {right_on} (right)")
    logger.info(f"Left DataFrame: {len(left_df)} rows")
    logger.info(f"Right DataFrame: {len(right_df)} rows")

    joined_df = left_df.merge(
        right_df,
        left_on=left_on,
        right_on=right_on,
        how='left',
        indicator=True
    )

    unmatched_df = joined_df[joined_df['_merge'] == 'left_only'].copy()
    joined_df = joined_df.drop(columns=['_merge'])
    if '_merge' in unmatched_df.columns:
        unmatched_df = unmatched_df.drop(columns=['_merge'])

    logger.info(f"Matched: {len(joined_df) - len(unmatched_df)} rows")
    logger.info(f"Unmatched: {len(unmatched_df)} rows")
    return joined_df, unmatched_df


def left_join_with_fallback(left_df: pd.DataFrame,
                            right_df: pd.DataFrame,
                            primary_left_on: str,
                            primary_right_on: str,
                            fallback_left_on: str,
                            fallback_right_on: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    logger.info(f"Primary join: {primary_left_on} -> {primary_right_on}")
    logger.info(f"Fallback join: {fallback_left_on} -> {fallback_right_on}")

    first_pass = left_df.merge(
        right_df,
        left_on=primary_left_on,
        right_on=primary_right_on,
        how='left',
        indicator=True
    )

    matched_df = first_pass[first_pass['_merge'] == 'both'].drop(columns=['_merge'])
    unmatched_left = first_pass[first_pass['_merge'] == 'left_only'].drop(columns=['_merge'])

    logger.info(f"Primary match: {len(matched_df)} rows matched")
    logger.info(f"Primary match: {len(unmatched_left)} rows unmatched, attempting fallback...")

    left_columns = left_df.columns.tolist()
    unmatched_left = unmatched_left[left_columns].copy()

    second_pass = unmatched_left.merge(
        right_df,
        left_on=fallback_left_on,
        right_on=fallback_right_on,
        how='left',
        indicator=True
    )

    fallback_matched = second_pass[second_pass['_merge'] == 'both'].drop(columns=['_merge'])
    still_unmatched = second_pass[second_pass['_merge'] == 'left_only'].drop(columns=['_merge'])
    still_unmatched = still_unmatched[left_columns].copy()

    logger.info(f"Fallback match: {len(fallback_matched)} rows matched")
    logger.info(f"Still unmatched: {len(still_unmatched)} rows")

    joined_df = pd.concat([matched_df, fallback_matched], ignore_index=True)

    logger.info(f"Total matched: {len(joined_df)} rows")
    logger.info(f"Total unmatched: {len(still_unmatched)} rows")
    return joined_df, still_unmatched


def filter_select_columns(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    existing_columns = [col for col in columns if col in df.columns]
    missing_columns = [col for col in columns if col not in df.columns]
    if missing_columns:
        logger.warning(f"Columns not found in DataFrame: {missing_columns}")
    logger.info(f"Selecting {len(existing_columns)} columns from {len(df.columns)}")
    return df[existing_columns].copy()


def filter_by_match(df1: pd.DataFrame,
                    df2: pd.DataFrame,
                    df1_col: str,
                    df2_col: str) -> pd.DataFrame:
    valid_values = set(df1[df1_col].dropna().unique())
    filtered_df = df2[df2[df2_col].isin(valid_values)].copy()
    logger.info(f"Filtering {df2_col} (df2) by {df1_col} (df1)")
    logger.info(f"Unique values in df1: {len(valid_values)}")
    logger.info(f"Rows in df2 before filter: {len(df2)}")
    logger.info(f"Rows in df2 after filter: {len(filtered_df)}")
    return filtered_df


# ── Internet Archive functions (now use ia_session) ─────────────────────────────

def get_brief_urls(citation: str) -> list:
    """Search Internet Archive for briefs matching a US citation."""
    ia_search_url = "https://archive.org/advancedsearch.php"
    query = f'collection:(us-supreme-court) AND title:("{citation}")'
    params = {
        'q': query,
        'fl[]': ['identifier', 'title'],
        'rows': 50,
        'output': 'json'
    }
    try:
        time.sleep(0.5)                              # polite rate-limit
        response = ia_session.get(ia_search_url, params=params)  # ← session
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching briefs for '{citation}': {e}")
        return []

    docs = data.get('response', {}).get('docs', [])
    results = []
    for doc in docs:
        identifier = doc.get('identifier', '')
        results.append({
            'title': doc.get('title', ''),
            'identifier': identifier,
            'url': f"https://archive.org/details/{identifier}"
        })
    return results


def get_file_urls(identifier: str) -> list:
    """Get PDF download URLs for an Internet Archive item."""
    metadata_url = f"https://archive.org/metadata/{identifier}/files"
    try:
        time.sleep(0.5)
        response = ia_session.get(metadata_url)                  # ← session
        response.raise_for_status()
        files = response.json().get('result', [])
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching files for '{identifier}': {e}")
        return []

    pdf_urls = []
    for f in files:
        if f.get('name', '').endswith('.pdf'):
            pdf_urls.append(
                f"https://archive.org/download/{identifier}/{f['name']}"
            )
    return pdf_urls


# ── CourtListener API functions (now use cl_session + cache) ────────────────────

missing_cases: list[str] = []


def pull_with_scid(scid: str):
    """Pull case data from CourtListener API using SCDB ID."""
    search_url = f"{api_url}?scdb_id={scid}"
    try:
        response = cl_session.get(search_url)                    # ← session
        response.raise_for_status()
        results = response.json().get("results", [])
        return results[0] if results else None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching SCID {scid}: {e}")
        return None


def pull_with_url(url: str):
    """Fetch any CourtListener API URL (uncached — use pull_with_url_cached)."""
    try:
        response = cl_session.get(url)                           # ← session
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error for {url}: {e}")
        return None


def full_url(path_or_url: str) -> str:
    if not path_or_url:
        return ""
    return urljoin(cl_url, path_or_url)


def get_case_url(case_info: dict) -> str:
    path = case_info.get("absolute_url", "")
    case_url = full_url(path)
    logger.info(f"Case url is {case_url}.")
    return case_url


def get_usCite(cluster_info: dict) -> str:
    """Extract the 'X U.S. Y' citation string from a cluster response."""
    if isinstance(cluster_info, list):
        cluster = cluster_info[0] if cluster_info else {}
    else:
        cluster = cluster_info

    for c in cluster.get("citations", []):
        if str(c.get("reporter", "")).strip() == "U.S.":
            return f'{c.get("volume")} {c.get("reporter")} {c.get("page")}'
    return ""


# ── Consolidated enrichment function (replaces separate steps 6/7/8) ───────────

def enrich_case(row):
    """
    Single pass per case: fetches CourtListener cluster info,
    resolves sub-opinions → cited US cases, and grabs audio files.
    Replaces the old get_CL_urls → iter_subop → get_audio pipeline.
    """
    row = row.copy()
    scid = row.get('caseId')
    if pd.isna(scid):
        return row

    logger.info(f"Processing case {scid}.")

    # ── A. Cluster lookup ────────────────────────────────────────────────
    case_info = pull_with_scid(scid)
    if case_info is None:
        missing_cases.append(scid)
        return row

    row['url'] = get_case_url(case_info)
    row['docket_url'] = full_url(case_info.get("docket", ""))
    subopinion_urls = case_info.get("sub_opinions", [])
    row['subopinion_urls'] = subopinion_urls

    # ── B. Collect every unique opinions_cited URL across sub-opinions ───
    all_cited_urls: set[str] = set()
    for op_url in subopinion_urls:
        opinion_info = pull_with_url_cached(op_url)              # ← cached
        if opinion_info:
            all_cited_urls.update(opinion_info.get("opinions_cited", []))

    # ── C. Resolve each cited opinion → its US citation string ───────────
    cited_cases: list[str] = []
    for cited_url in all_cited_urls:
        cited_opinion = pull_with_url_cached(cited_url)          # ← cached
        if cited_opinion is None:
            continue
        cluster_url = cited_opinion.get("cluster", "")
        if not cluster_url:
            continue
        cluster_info = pull_with_url_cached(cluster_url)         # ← cached
        if cluster_info is None:
            continue
        citation = get_usCite(cluster_info)
        if citation:
            cited_cases.append(citation)
            logger.info(f"Case cites: {citation}")

    row['cited_cases'] = cited_cases
    logger.info(f"Case {scid} cites {len(cited_cases)} US cases.")

    # ── D. Audio files from the docket ───────────────────────────────────
    if row['docket_url']:
        docket_info = pull_with_url_cached(row['docket_url'])    # ← cached
        if docket_info:
            row['audio_files'] = docket_info.get("audio_files", [])

    return row


def process_citations(citations: list) -> dict:
    """
    For each citation, retrieves brief URLs and associated PDF download links
    from the Internet Archive.
    """
    all_results = {}
    for cite in citations:
        results = get_brief_urls(cite)
        all_results[cite] = []
        logger.info(f"{cite}: {len(results)} result(s)")
        for r in results:
            logger.info(f"  Title: {r['title']}")
            logger.info(f"  URL:   {r['url']}")
            pdfs = get_file_urls(r['identifier'])
            if pdfs:
                logger.info(f"  PDFs:")
                for pdf in pdfs:
                    logger.info(f"    {pdf}")
            all_results[cite].append({
                "title": r['title'],
                "url": r['url'],
                "pdfs": pdfs if pdfs else []
            })
    return all_results


def apply_codebook(df: pd.DataFrame, codebook_dir: str) -> pd.DataFrame:
    """
    Replaces numeric codes with full text labels using crosswalk CSVs.
    Uses crosswalk.get(x, x) so unmatched values are preserved rather
    than silently becoming None.
    """
    df = df.copy()
    for filename in os.listdir(codebook_dir):
        if not filename.endswith('.csv'):
            continue
        col_name = filename.replace('.csv', '')
        if col_name not in df.columns:
            logger.warning(
                f"Codebook file '{filename}' has no matching column "
                f"in DataFrame - skipping"
            )
            continue

        codebook_path = os.path.join(codebook_dir, filename)
        codebook = pd.read_csv(codebook_path)

        if codebook.shape[1] != 2:
            logger.warning(f"'{filename}' does not have exactly 2 columns - skipping")
            continue

        code_col, label_col = codebook.columns
        crosswalk = codebook.set_index(code_col)[label_col].to_dict()

        before = df[col_name].isna().sum()
        # ← preserve original value when no codebook match exists
        df[col_name] = df[col_name].map(lambda x: crosswalk.get(x, x))
        after = df[col_name].isna().sum()
        new_nulls = after - before
        if new_nulls > 0:
            logger.warning(f"  '{col_name}': {new_nulls} values had no match in codebook")
        logger.info(f"  '{col_name}': decoded using '{filename}'")
    return df


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

# ── 1. Load the files ───────────────────────────────
scildb_raw = pd.read_csv('data/new_list.csv', encoding='utf-8-sig')
scdbc1 = pd.read_csv('data/SCDB_2025_01_caseCentered_Citation.csv', encoding='latin1')
scdbc2 = pd.read_csv('data/SCDB_Legacy_07_caseCentered_Citation.csv', encoding='latin1')
scdbv1 = pd.read_csv('data/SCDB_2025_01_justiceCentered_Citation.csv', encoding='latin1')
scdbv2 = pd.read_csv('data/SCDB_Legacy_07_justiceCentered_Citation.csv', encoding='latin1')

scdbc = merge_dataframes(scdbc1, scdbc2)
scdbv = merge_dataframes(scdbv1, scdbv2)

# ── 2. Left join scildb_raw with combined scdbc ───────────────────────────────
scildbc, unmatched = left_join_with_fallback(
    left_df=scildb_raw,
    right_df=scdbc,
    primary_left_on='citation',
    primary_right_on='usCite',
    fallback_left_on='listName',
    fallback_right_on='caseName'
)

if len(unmatched) > 0:
    logger.error(f"{len(unmatched)} cases in scildb_raw were not matched in scdbc")
    unmatched.to_csv('data/unmatched_cases.csv', index=False)

# ── 3. Filter to only the columns we need ────────────────────────────────────
columns_to_keep = [
    'listName', 'usCite', 'caseName', 'finalCategories', 'tribesInvolved', 'caseId', 'docketId', 'voteId', 'term',
    'dateDecision', 'dateArgument', 'dateRearg', 'petitioner',
    'petitionerState', 'respondent', 'respondentState',
    'precedentAlteration', 'caseOrigin', 'caseOriginState',
    'caseSource', 'caseSourceState', 'certReason', 'decisionType',
    'issue', 'lawSupp', 'lawType', 'lawMinor2', 'partyWinning'
]
scildbc = filter_select_columns(scildbc, columns_to_keep)

# ── 4. Add columns for Court Listener data ───────────────────────────────────
scildbc['url'] = ""
scildbc['subopinion_urls'] = [[] for _ in range(len(scildbc))]
scildbc['docket_url'] = ""
scildbc['cited_cases'] = [[] for _ in range(len(scildbc))]
scildbc['audio_files'] = [[] for _ in range(len(scildbc))]

# ── 5. Enrich every case in ONE pass with CL urls and cited cases ─────────
logger.info("Enriching cases from Court Listener (single pass)...")
scildbc = scildbc.apply(enrich_case, axis=1)

if missing_cases:
    logger.warning(
        f"{len(missing_cases)} cases not found in Court Listener: {missing_cases}"
    )

logger.info(f"API cache size: {len(_api_cache)} unique URLs fetched")
scildbc.to_csv('data/scildb_enriched2.csv', index=False)

# ── 6. Get brief urls from Internet Archive ──────────────────────────────────
logger.info("Fetching Internet Archive brief URLs...")
citations = scildbc['usCite'].dropna().unique().tolist()
brief_results = process_citations(citations)
scildbc['brief_results'] = scildbc['usCite'].map(brief_results)
scildbc['brief_results'] = scildbc['brief_results'].apply(
    lambda x: x if isinstance(x, list) else []
)
scildbc.to_csv('data/scildb_briefs2.csv', index=False)

# ── 7. Filter scdbv to only cases in final scildbc ───────────────────────────
scildbv = filter_by_match(
    df1=scildbc,
    df2=scdbv,
    df1_col='caseId',
    df2_col='caseId'
)
scildbv = filter_select_columns(scildbv, columns_to_keep)

# ── 8. Apply codebook to both dataframes ─────────────────────────────────────
logger.info("Applying codebook labels...")
scildbc = apply_codebook(df=scildbc, codebook_dir='data/codebook')
scildbv = apply_codebook(df=scildbv, codebook_dir='data/codebook')
logger.info("Codebook labels applied.")

# ── 9. Save final files ──────────────────────────────────────────────────────
scildbc.to_csv('data/scildb_final2.csv', index=False)
scildbv.to_csv('data/scdbv_filtered2.csv', index=False)

scildbc.to_json('data/scildb_cases2.json', orient='records', indent=2)
scildbv.to_json('data/scildb_votes2.json', orient='records', indent=2)

logger.info("Processing complete!")
logger.info(f"  scildb:         {len(scildbc)} rows")
logger.info(f"  scdbv_filtered: {len(scildbv)} rows")
logger.info(f"  unmatched:      {len(unmatched)} rows")
logger.info(f"  missing cases:  {len(missing_cases)}")
logger.info(f"  API cache hits: {len(_api_cache)} unique URLs")