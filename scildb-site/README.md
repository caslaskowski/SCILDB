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
`meta.json`). These are generated from the research data in `../data/` by the build script at
the repository root:

```sh
python ../build_site_data.py
```

The script dedupes cases, decodes SCDB numeric codes using `../data/codebook/*.csv`, computes
the "disposition for the Native party" (SCDB party code 170 + winning-party code), and compacts
the per-justice vote records. Re-run it whenever `../data/scildb_cases.json` or
`../data/scildb_votes.json` change, then rebuild the site.
