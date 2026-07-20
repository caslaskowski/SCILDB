"""
Build compact, decoded JSON data files for the scildb-site frontend.

Reads the raw research outputs (data/scildb_cases.json, data/scildb_votes.json,
data/justice_key.json, data/codebook/*.csv) and writes three files to
scildb-site/public/data/:

  cases.json    - one record per unique caseId, codebook-decoded
  votes.json    - one compact record per (caseId, justice) vote
  justices.json - justice identity metadata (full name, years on Court)
"""
import csv
import json
import os
import re

file_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(file_dir)

OUT_DIR = os.path.join('scildb-site', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)


# ── Codebook crosswalks ────────────────────────────────────────────────────────

def load_crosswalk(filename: str) -> dict:
    path = os.path.join('data', 'codebook', filename)
    with open(path, encoding='utf-8-sig') as f:
        rows = list(csv.reader(f))
    return {row[0].strip(): row[1].strip() for row in rows[1:] if len(row) >= 2}


petitioner_cw = load_crosswalk('petitioner.csv')
respondent_cw = load_crosswalk('respondent.csv')
issue_cw = load_crosswalk('issue.csv')
decision_type_cw = load_crosswalk('decisionType.csv')
case_origin_cw = load_crosswalk('caseOrigin.csv')
case_source_cw = load_crosswalk('caseSource.csv')
state_cw = load_crosswalk('caseOriginState.csv')
cert_reason_cw = load_crosswalk('certReason.csv')
party_winning_cw = load_crosswalk('partyWinning.csv')
writer_cw = load_crosswalk('majOpinWriter.csv')  # numeric code -> full name

# SCDB vote codes (no codebook CSV exists for these)
VOTE_LABELS = {
    '1': 'voted with majority or plurality',
    '2': 'dissent',
    '3': 'regular concurrence',
    '4': 'special concurrence',
    '5': 'judgment of the Court',
    '6': 'dissent from denial or dismissal of certiorari',
    '7': 'jurisdictional dissent',
    '8': 'participated in equally divided vote',
}

NATIVE_PARTY_CODE = '170'  # "Indian, including Indian tribe or nation"

# Display-name typo fixes for the site (source lists left untouched)
NAME_FIXES = {
    'OK v.TX': 'OK v. TX',
}


def decode(cw: dict, value) -> str | None:
    if value is None:
        return None
    key = str(value).strip()
    if key.endswith('.0'):
        key = key[:-2]
    return cw.get(key, key) if key else None


def to_int(value) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def split_list(value) -> list[str]:
    if not value or not isinstance(value, str):
        return []
    return [part.strip() for part in value.split(',') if part.strip()]


def sort_date(date_decision, term) -> int:
    """YYYYMMDD int from a M/D/YYYY dateDecision, falling back to mid-term."""
    if date_decision and isinstance(date_decision, str):
        m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_decision.strip())
        if m:
            month, day, year = (int(g) for g in m.groups())
            return year * 10000 + month * 100 + day
    return (term or 0) * 10000 + 615


def disposition(petitioner, respondent, party_winning) -> str:
    """How the Court's disposition fell for the Native party, if there was one."""
    # note: values may be ints (manual cases) — 0 is a real code, so no `or ''`
    pet = ('' if petitioner is None else str(petitioner)).strip()
    resp = ('' if respondent is None else str(respondent)).strip()
    win = ('' if party_winning is None else str(party_winning)).strip()
    if NATIVE_PARTY_CODE not in (pet, resp):
        return 'No Native party coded'
    if win == '2':
        return 'Unclear'
    if (pet == NATIVE_PARTY_CODE and win == '1') or (resp == NATIVE_PARTY_CODE and win == '0'):
        return 'Favorable'
    if (pet == NATIVE_PARTY_CODE and win == '0') or (resp == NATIVE_PARTY_CODE and win == '1'):
        return 'Unfavorable'
    return 'Unclear'


# ── Load raw data ──────────────────────────────────────────────────────────────

with open('data/scildb_cases.json', encoding='utf-8') as f:
    raw_cases = json.load(f)
with open('data/scildb_votes.json', encoding='utf-8') as f:
    raw_votes = json.load(f)
with open('data/justice_key.json', encoding='utf-8') as f:
    justice_key = json.load(f)

# ── Per-case extras derived from the vote file (chief, opinion writer) ─────────

case_chief: dict[str, str] = {}
case_writer: dict[str, str] = {}
for v in raw_votes:
    cid = v.get('caseId')
    if not cid:
        continue
    if cid not in case_chief and v.get('chief'):
        case_chief[cid] = v['chief']
    if cid not in case_writer and v.get('majOpinWriter'):
        name = decode(writer_cw, v['majOpinWriter'])
        if name:
            case_writer[cid] = name

# ── Build cases.json ───────────────────────────────────────────────────────────

cases_out = []
seen_ids = set()
for c in raw_cases:
    cid = c.get('caseId')
    if not cid or cid in seen_ids:
        continue
    seen_ids.add(cid)

    term = to_int(c.get('term')) or to_int(c.get('Year'))
    briefs = [
        {'title': b.get('title', ''), 'url': b.get('url', '')}
        for b in (c.get('brief_results') or [])
        if isinstance(b, dict) and b.get('url')
    ]

    name = c.get('listName') or c.get('caseName') or ''
    name = NAME_FIXES.get(name, name)
    cases_out.append({
        'id': cid,
        'name': name,
        'usCite': c.get('usCite') or c.get('Citation'),
        'term': term,
        'dateDecision': c.get('dateDecision'),
        'sortDate': sort_date(c.get('dateDecision'), term),
        'dateArgument': c.get('dateArgument'),
        'categories': split_list(c.get('finalCategories')),
        'tribes': split_list(c.get('tribesInvolved')),
        'petitioner': decode(petitioner_cw, c.get('petitioner')),
        'respondent': decode(respondent_cw, c.get('respondent')),
        'partyWinning': decode(party_winning_cw, c.get('partyWinning')),
        'disposition': disposition(c.get('petitioner'), c.get('respondent'), c.get('partyWinning')),
        'issue': decode(issue_cw, c.get('issue')),
        'decisionType': decode(decision_type_cw, c.get('decisionType')),
        'caseOrigin': decode(case_origin_cw, c.get('caseOrigin')),
        'caseOriginState': decode(state_cw, c.get('caseOriginState')),
        'caseSource': decode(case_source_cw, c.get('caseSource')),
        'certReason': decode(cert_reason_cw, c.get('certReason')),
        'chief': case_chief.get(cid),
        'majOpinWriter': case_writer.get(cid),
        'majVotes': to_int(c.get('majVotes')),
        'minVotes': to_int(c.get('minVotes')),
        'precedentAlteration': str(c.get('precedentAlteration') or '') == '1',
        'url': c.get('url') or None,
        'briefs': briefs,
        'citedCount': len(c.get('cited_cases') or []),
    })

# ── Merge manually-added cases (not in SCDB; see data/manual_cases.json) ─────
# Records carry SCDB-style numeric codes assigned by the research team; decode
# them through the same codebook crosswalks as pipeline cases.

MANUAL_PATH = os.path.join('data', 'manual_cases.json')
if os.path.exists(MANUAL_PATH):
    with open(MANUAL_PATH, encoding='utf-8') as f:
        manual = json.load(f)
    for m in manual:
        if m['id'] in seen_ids:
            continue
        seen_ids.add(m['id'])
        term = to_int(m.get('term'))
        cases_out.append({
            'id': m['id'],
            'name': NAME_FIXES.get(m['name'], m['name']),
            'usCite': m.get('usCite'),
            'term': term,
            'dateDecision': m.get('dateDecision'),
            'sortDate': sort_date(m.get('dateDecision'), term),
            'dateArgument': m.get('dateArgument'),
            'categories': m.get('categories', []),
            'tribes': m.get('tribes', []),
            'petitioner': decode(petitioner_cw, m.get('petitioner')),
            'respondent': decode(respondent_cw, m.get('respondent')),
            'partyWinning': decode(party_winning_cw, m.get('partyWinning')),
            'disposition': disposition(m.get('petitioner'), m.get('respondent'), m.get('partyWinning')),
            'issue': decode(issue_cw, m.get('issue')),
            'decisionType': decode(decision_type_cw, m.get('decisionType')),
            'caseOrigin': decode(case_origin_cw, m.get('caseOrigin')),
            'caseOriginState': m.get('caseOriginState'),
            'caseSource': decode(case_source_cw, m.get('caseSource')),
            'certReason': decode(cert_reason_cw, m.get('certReason')),
            'chief': m.get('chief'),
            'majOpinWriter': m.get('majOpinWriter'),
            'majVotes': to_int(m.get('majVotes')),
            'minVotes': to_int(m.get('minVotes')),
            'precedentAlteration': bool(m.get('precedentAlteration')),
            'url': m.get('url'),
            'briefs': m.get('briefs', []),
            'citedCount': to_int(m.get('citedCount')) or 0,
        })

# Order by the full decision date, not just the term year, so cases decided in
# the same term appear in true chronological sequence.
cases_out.sort(key=lambda x: (x['sortDate'], x['id']))

# ── Build votes.json (compact keys, deduped per caseId+justice) ────────────────

votes_out = []
seen_votes = set()
for v in raw_votes:
    cid = v.get('caseId')
    jname = v.get('justiceName')
    if not cid or not jname or cid not in seen_ids:
        continue
    key = (cid, jname)
    if key in seen_votes:
        continue
    seen_votes.add(key)
    votes_out.append({
        'c': cid,                                  # caseId
        'j': jname,                                # SCDB justiceName
        'v': to_int(v.get('vote')),                # vote code (see VOTE_LABELS)
        'o': to_int(v.get('opinion')),             # 1 none / 2 wrote / 3 co-authored
        'm': to_int(v.get('majority')),            # 1 dissent / 2 majority
        'w': 1 if decode(writer_cw, v.get('majOpinWriter')) == decode(writer_cw, v.get('justice')) else 0,
    })

# ── Build justices.json ────────────────────────────────────────────────────────

participated = {}
for v in votes_out:
    participated.setdefault(v['j'], 0)
    participated[v['j']] += 1

justices_out = []
for j in justice_key:
    years = j.get('yearsCourt', '')
    m = re.findall(r'\d{4}', years)
    start = int(m[0]) if m else None
    end = int(m[-1]) if len(m) > 1 else None
    justices_out.append({
        'justiceName': j['justiceName'],
        'fullName': j['fullName'],
        'yearsCourt': years,
        'startYear': start,
        'endYear': end,
        'caseCount': participated.get(j['justiceName'], 0),
    })

# ── Write outputs ──────────────────────────────────────────────────────────────

meta = {
    'cases': len(cases_out),
    'votes': len(votes_out),
    'justices': len(justices_out),
    'justicesWithVotes': sum(1 for j in justices_out if j['caseCount'] > 0),
    'termMin': min(c['term'] for c in cases_out if c['term']),
    'termMax': max(c['term'] for c in cases_out if c['term']),
    'voteLabels': VOTE_LABELS,
}

with open(os.path.join(OUT_DIR, 'cases.json'), 'w', encoding='utf-8') as f:
    json.dump(cases_out, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(OUT_DIR, 'votes.json'), 'w', encoding='utf-8') as f:
    json.dump(votes_out, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(OUT_DIR, 'justices.json'), 'w', encoding='utf-8') as f:
    json.dump(justices_out, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(OUT_DIR, 'meta.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print(json.dumps(meta, indent=2))
# quick sanity peeks
cats = sorted({cat for c in cases_out for cat in c['categories']})
print(f'\n{len(cats)} unique categories:')
for cat in cats:
    print('  -', cat)
dispositions = {}
for c in cases_out:
    dispositions[c['disposition']] = dispositions.get(c['disposition'], 0) + 1
print('\ndispositions:', dispositions)
