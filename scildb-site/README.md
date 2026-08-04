# SCILDB — Supreme Court Indian Law Database

A single-page site for exploring the Supreme Court Indian Law Database: 678 federal Indian law
cases decided by the U.S. Supreme Court (1810–2023), with justice-level voting records.

Built with Vite, React 19, TypeScript, Tailwind CSS 4, and Recharts. Fully static — no backend.

## Pages

- **Home** (`#/`) — overview, headline stats, cases-by-decade chart
- **Cases** (`#/cases`) — filter by search, category, disposition for the Native party, Chief
  Justice era, and term range; stacked decade chart + category frequency chart; sortable,
  expandable case table with links to CourtListener opinions and Internet Archive briefs;
  filtered CSV export
- **Justices** (`#/justices`) — per-justice voting stats scoped by category/era filters;
  diverging "sided with / against the Native party" chart; sortable leaderboard; per-justice
  case-by-case record; filtered CSV export
- **About** (`#/about`) — purpose, methodology, data sources, contributors

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Data

The site reads static JSON from `public/data/` (`cases.json`, `votes.json`, `justices.json`,
`meta.json`). These files are the complete dataset the site needs at runtime — no other data
files or scripts are required to build or deploy.

The JSON was originally generated from SCDB source data by a Python pipeline
(`build_site_data.py` and the `data/` directory at the repository root). That pipeline dedupes
cases, decodes SCDB numeric codes, computes the "disposition for the Native party," and
compacts the per-justice vote records. It was removed from the working tree to keep the
repository lean, but it remains fully recoverable from git history — to restore it, find the
last commit that contained it (`git log --oneline -- build_site_data.py`) and check it out
(`git checkout <commit> -- build_site_data.py data/`). Re-run the pipeline and rebuild the
site whenever the underlying research data changes.

## Justice portraits

Portraits on the Justices page come from Wikipedia's list of Supreme Court justices (hosted on
Wikimedia Commons; mostly public-domain official portraits). They are fetched by a small script
at the repository root — run it locally, review its match report, then commit the results:

```sh
pip install requests beautifulsoup4
python fetch_portraits.py
```

It downloads one 256px thumbnail per justice into `public/assets/justices/` and writes
`public/data/portraits.json`, which maps each justice to their image and its source article.
The site renders an initials avatar for any justice without a portrait, so a partial run never
breaks anything.
