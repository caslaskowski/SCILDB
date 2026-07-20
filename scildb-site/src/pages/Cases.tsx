import Papa from 'papaparse'
import { Fragment, useMemo, useState } from 'react'
import { ChartCard, DecadeColumns, HBarList, StatTile } from '../components/charts'
import { FilterBar, MultiSelect, SearchBox, SelectBox, YearRange } from '../components/filters'
import OriginMap from '../components/OriginMap'
import { chronoCompare, decadeOf, decisionYear, formatNumber, useDataset } from '../lib/data'
import { getHashQuery } from '../lib/router'
import { STATE_NAMES } from '../lib/usStates'
import type { Case, Dataset } from '../types'

// full state name -> two-letter code, longest names first so "West Virginia"
// matches before "Virginia" when scanning court names
const NAME_TO_CODE = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name, code]))
const NAMES_BY_LENGTH = Object.keys(NAME_TO_CODE).sort((a, b) => b.length - a.length)

function originState(kase: Case): string | null {
  if (kase.caseOriginState && NAME_TO_CODE[kase.caseOriginState]) return NAME_TO_CODE[kase.caseOriginState]
  if (kase.caseOrigin) {
    for (const name of NAMES_BY_LENGTH) {
      if (kase.caseOrigin.includes(name)) return NAME_TO_CODE[name]
    }
  }
  return null
}

const PAGE_SIZE = 25

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink3">{label}</dt>
      <dd className="m-0 text-sm text-ink2">{children}</dd>
    </div>
  )
}

function CaseDetail({ kase, onCategory }: { kase: Case; onCategory: (category: string) => void }) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-hairline bg-page/60 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      <DetailRow label="Petitioner">{kase.petitioner}</DetailRow>
      <DetailRow label="Respondent">{kase.respondent}</DetailRow>
      <DetailRow label="Outcome">{kase.partyWinning}</DetailRow>
      <DetailRow label="SCDB issue">{kase.issue}</DetailRow>
      <DetailRow label="Decision type">{kase.decisionType}</DetailRow>
      <DetailRow label="Vote split">
        {kase.majVotes != null && kase.minVotes != null ? `${kase.majVotes}–${kase.minVotes}` : null}
      </DetailRow>
      <DetailRow label="Chief Justice">{kase.chief}</DetailRow>
      <DetailRow label="Majority opinion by">{kase.majOpinWriter}</DetailRow>
      <DetailRow label="Argued / decided">
        {[kase.dateArgument, kase.dateDecision].filter(Boolean).join(' → ') || null}
      </DetailRow>
      <DetailRow label="Case origin">
        {[kase.caseOrigin, kase.caseOriginState].filter(Boolean).join(', ') || null}
      </DetailRow>
      <DetailRow label="Reviewed from">{kase.caseSource}</DetailRow>
      <DetailRow label="Reason cert granted">{kase.certReason}</DetailRow>
      {kase.tribes.length > 0 && <DetailRow label="Tribes involved">{kase.tribes.join('; ')}</DetailRow>}
      {kase.precedentAlteration && <DetailRow label="Precedent">Formally altered precedent</DetailRow>}
      <div className="sm:col-span-2 lg:col-span-3">
        <dt className="text-[11px] font-medium text-ink3">Categories</dt>
        <dd className="m-0 mt-1 flex flex-wrap gap-1.5">
          {kase.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategory(cat)}
              aria-label={`Search all cases in the category ${cat}`}
              className="cursor-pointer rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink hover:border-accent hover:bg-accent-wash hover:text-accent-strong"
            >
              {cat}
            </button>
          ))}
        </dd>
      </div>
      {(kase.url || kase.briefs.length > 0) && (
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-[11px] font-medium text-ink3">Primary sources</dt>
          <dd className="m-0 mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {kase.url && (
              <a href={kase.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Read {kase.name}
                {kase.usCite ? `, ${kase.usCite}` : ''} on CourtListener ↗
              </a>
            )}
            {kase.briefs.slice(0, 4).map((brief, i) => (
              <a key={brief.url} href={brief.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Briefs & record for {kase.usCite ?? kase.name}
                {kase.briefs.length > 1 ? ` (set ${i + 1})` : ''} on the Internet Archive ↗
              </a>
            ))}
          </dd>
        </div>
      )}
    </div>
  )
}

/** "Page [n] of N" jump control so users can go straight to, say, page 20. */
function PageJump({
  page,
  pageCount,
  onJump,
}: {
  page: number
  pageCount: number
  onJump: (page: number) => void
}) {
  const [draft, setDraft] = useState(String(page + 1))
  // Re-sync the input when the page changes from outside (prev/next buttons,
  // filter changes) — React's "adjust state during render" pattern.
  const [lastPage, setLastPage] = useState(page)
  if (page !== lastPage) {
    setLastPage(page)
    setDraft(String(page + 1))
  }
  const commit = () => {
    const n = Math.round(Number(draft))
    if (!Number.isFinite(n) || n < 1) {
      setDraft(String(page + 1))
      return
    }
    onJump(Math.min(pageCount, Math.max(1, n)) - 1)
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink3">
      Page
      <input
        type="number"
        min={1}
        max={pageCount}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        aria-label={`Jump to page (1 to ${pageCount})`}
        className="h-7 w-14 rounded-md border border-hairline bg-page px-1.5 text-center text-xs text-ink tabular-nums outline-none focus:border-accent"
      />
      of {formatNumber(pageCount)}
    </span>
  )
}

export default function Cases() {
  const { data, error } = useDataset()
  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>
  if (!data) return <p className="py-16 text-center text-sm text-ink3">Loading the database…</p>
  return <CasesView data={data} />
}

function CasesView({ data }: { data: Dataset }) {
  // Filters seeded from the URL hash (e.g. "#/cases?from=1830&to=1839" from the
  // home-page decade chart, or "?cat=Treaties" from the methodology page).
  const [initialQuery] = useState(getHashQuery)
  const clampYear = (n: number) => Math.min(data.yearMax, Math.max(data.yearMin, n))

  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>(() => {
    const fromQuery = initialQuery.getAll('cat')
    const valid = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) valid.add(cat)
    return fromQuery.filter((cat) => valid.has(cat))
  })
  const [chief, setChief] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [yearFrom, setYearFrom] = useState(() => {
    const q = Number(initialQuery.get('from'))
    return q ? clampYear(q) : data.yearMin
  })
  const [yearTo, setYearTo] = useState(() => {
    const q = Number(initialQuery.get('to'))
    return q ? clampYear(q) : data.yearMax
  })
  const [sortKey, setSortKey] = useState<'chrono' | 'name'>('chrono')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) set.add(cat)
    return [...set].sort()
  }, [data])

  const allChiefs = useMemo(() => {
    const seen: string[] = []
    for (const c of data.cases) {
      if (c.chief && !seen.includes(c.chief)) seen.push(c.chief)
    }
    return seen
  }, [data])

  /** Full state names with at least one case, for the origin-state dropdown. */
  const allOriginStates = useMemo(() => {
    const codes = new Set<string>()
    for (const c of data.cases) {
      const code = originState(c)
      if (code) codes.add(code)
    }
    return [...codes].map((code) => STATE_NAMES[code]).sort()
  }, [data])

  // Everything except the state filter, so the map keeps showing all states
  // (with the selected one highlighted) instead of collapsing to one circle.
  const filteredExceptState = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.cases.filter((c) => {
      const year = decisionYear(c)
      if (year < yearFrom || year > yearTo) return false
      if (chief && c.chief !== chief) return false
      if (categories.length > 0 && !categories.every((cat) => c.categories.includes(cat))) return false
      if (q) {
        const hay = `${c.name} ${c.usCite ?? ''} ${c.tribes.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, search, categories, chief, yearFrom, yearTo])

  const filtered = useMemo(() => {
    if (!stateCode) return filteredExceptState
    return filteredExceptState.filter((c) => originState(c) === stateCode)
  }, [filteredExceptState, stateCode])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      // "Decided" sorts by the full decision date, matching the case numbers (#)
      if (sortKey === 'chrono') return chronoCompare(a, b) * sortDir
      return a.name.localeCompare(b.name) * sortDir
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const byDecade = useMemo(() => {
    const counts = new Map<number, number>()
    for (const c of filtered) {
      const d = decadeOf(decisionYear(c))
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    if (counts.size === 0) return []
    const decades = [...counts.keys()]
    const min = Math.min(...decades)
    const max = Math.max(...decades)
    const rows: { decade: number; count: number }[] = []
    for (let d = min; d <= max; d += 10) rows.push({ decade: d, count: counts.get(d) ?? 0 })
    return rows
  }, [filtered])

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of filtered) for (const cat of c.categories) counts.set(cat, (counts.get(cat) ?? 0) + 1)
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [filtered])

  const yearSpan = useMemo(() => {
    if (filtered.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const c of filtered) {
      const y = decisionYear(c)
      if (y < min) min = y
      if (y > max) max = y
    }
    return { min, max }
  }, [filtered])

  const categoryCount = useMemo(() => {
    const set = new Set<string>()
    for (const c of filtered) for (const cat of c.categories) set.add(cat)
    return set.size
  }, [filtered])

  const origins = useMemo(() => {
    const byState = new Map<string, number>()
    const courtsByState = new Map<string, Map<string, number>>()
    const other = new Map<string, number>()
    for (const c of filteredExceptState) {
      const code = originState(c)
      if (code) {
        byState.set(code, (byState.get(code) ?? 0) + 1)
        const court = c.caseOrigin ?? 'Court not recorded'
        const courts = courtsByState.get(code) ?? new Map<string, number>()
        courts.set(court, (courts.get(court) ?? 0) + 1)
        courtsByState.set(code, courts)
      } else other.set(c.caseOrigin ?? 'Origin not recorded', (other.get(c.caseOrigin ?? 'Origin not recorded') ?? 0) + 1)
    }
    return {
      points: [...byState.entries()].map(([code, count]) => ({
        code,
        count,
        courts: [...(courtsByState.get(code) ?? new Map<string, number>()).entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      })),
      other: [...other.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      topStates: [...byState.entries()]
        .map(([code, value]) => ({ label: STATE_NAMES[code], value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    }
  }, [filteredExceptState])

  const filtersActive =
    search !== '' ||
    categories.length > 0 ||
    chief !== '' ||
    stateCode !== '' ||
    yearFrom !== data.yearMin ||
    yearTo !== data.yearMax

  const clearFilters = () => {
    setSearch('')
    setCategories([])
    setChief('')
    setStateCode('')
    setYearFrom(data.yearMin)
    setYearTo(data.yearMax)
    setPage(0)
  }

  const setFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const toggleSort = (key: 'chrono' | 'name') => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const exportCsv = () => {
    const rows = sorted.map((c) => ({
      caseNumber: c.index,
      case: c.name,
      citation: c.usCite,
      yearDecided: decisionYear(c),
      dateDecided: c.dateDecision,
      categories: c.categories.join('; '),
      tribes: c.tribes.join('; '),
      petitioner: c.petitioner,
      respondent: c.respondent,
      voteSplit: c.majVotes != null && c.minVotes != null ? `${c.majVotes}-${c.minVotes}` : '',
      chief: c.chief,
      majorityOpinionBy: c.majOpinWriter,
      courtListenerUrl: c.url,
    }))
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'scildb_cases_filtered.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Cases</h1>
        <p className="mt-1 text-sm text-ink2">
          Every federal Indian law case decided by the Supreme Court, {data.yearMin}–{data.yearMax}. Filter
          by topic, era, Chief Justice, or the state where the case began; the charts and table below update
          together. All years and decades on this page reflect the date each decision was issued, not the
          Court term, and each case's number (#) gives its place in chronological order — the first case
          decided is #1.
        </p>
      </header>

      <FilterBar onClear={clearFilters} active={filtersActive}>
        <SearchBox
          label="Search"
          value={search}
          onChange={setFilter(setSearch)}
          placeholder="Case name, citation, or tribe…"
        />
        <MultiSelect
          label="Categories"
          options={allCategories}
          selected={categories}
          onChange={setFilter(setCategories)}
        />
        <SelectBox label="Chief Justice era" value={chief} onChange={setFilter(setChief)} options={allChiefs} />
        <SelectBox
          label="Origin state"
          value={stateCode ? (STATE_NAMES[stateCode] ?? '') : ''}
          onChange={setFilter((name: string) => setStateCode(name ? (NAME_TO_CODE[name] ?? '') : ''))}
          options={allOriginStates}
        />
        <YearRange
          label="Year decided"
          min={data.yearMin}
          max={data.yearMax}
          from={yearFrom}
          to={yearTo}
          onChange={(f, t) => {
            setYearFrom(f)
            setYearTo(t)
            setPage(0)
          }}
        />
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Cases matching" value={formatNumber(filtered.length)} />
        <StatTile label="First decided" value={yearSpan ? String(yearSpan.min) : '—'} />
        <StatTile label="Most recent" value={yearSpan ? String(yearSpan.max) : '—'} />
        <StatTile label="Categories represented" value={formatNumber(categoryCount)} detail={`of ${allCategories.length} total`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Cases by decade decided"
          subtitle="Grouped by the decade of each decision date (not the Court term), within the current filter"
        >
          <DecadeColumns data={byDecade} series={[{ key: 'count', label: 'Cases', color: 'var(--viz-1)' }]} />
        </ChartCard>
        <ChartCard title="Most frequent categories" subtitle="Within the current filter — click a bar to add it as a filter">
          <HBarList
            items={topCategories}
            onClickItem={(label) => {
              if (!categories.includes(label)) setCategories([...categories, label])
              setPage(0)
            }}
          />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard
          title="Where the cases began"
          subtitle="Circle area is proportional to matching cases originating in each state's courts (state and federal) — click a state to filter the case list to it"
        >
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <OriginMap
              points={origins.points}
              selectedCode={stateCode || null}
              onSelectState={(code) => {
                setStateCode(code === stateCode ? '' : code)
                setPage(0)
              }}
            />
            <div className="flex flex-col gap-4">
              {stateCode && (
                <p className="rounded-md border border-accent/40 bg-accent-wash px-3 py-2 text-xs text-ink2">
                  Showing cases that began in <span className="font-semibold text-ink">{STATE_NAMES[stateCode]}</span>.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStateCode('')
                      setPage(0)
                    }}
                    className="cursor-pointer font-medium text-accent hover:underline"
                  >
                    Clear
                  </button>
                </p>
              )}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-ink">Top states</h4>
                <HBarList
                  items={origins.topStates}
                  onClickItem={(name) => {
                    const code = NAME_TO_CODE[name]
                    if (code) {
                      setStateCode(code === stateCode ? '' : code)
                      setPage(0)
                    }
                  }}
                />
              </div>
              {origins.other.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-ink">Other courts (not on the map)</h4>
                  <ul className="flex flex-col gap-0.5 text-xs text-ink2">
                    {origins.other.slice(0, 8).map((o) => (
                      <li key={o.label} className="flex justify-between gap-2">
                        <span className="truncate" title={o.label}>
                          {o.label}
                        </span>
                        <span className="font-medium text-ink tabular-nums">{formatNumber(o.value)}</span>
                      </li>
                    ))}
                    {origins.other.length > 8 && (
                      <li className="text-ink3">
                        + {origins.other.length - 8} more origin{origins.other.length - 8 === 1 ? '' : 's'}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
          <p className="text-xs text-ink3">
            {formatNumber(sorted.length)} case{sorted.length === 1 ? '' : 's'} · page {safePage + 1} of {pageCount}
          </p>
          <button
            type="button"
            onClick={exportCsv}
            className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 hover:bg-accent-wash"
          >
            Download filtered CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-[11px] text-ink3 uppercase">
                <th className="py-2 pr-1 pl-4 font-medium" scope="col" title="Chronological case number — the first case decided is #1">
                  #
                </th>
                <th
                  className="px-3 py-2 font-medium"
                  scope="col"
                  aria-sort={sortKey === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => toggleSort('name')} className="cursor-pointer uppercase hover:text-ink">
                    Case {sortKey === 'name' ? (sortDir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th
                  className="px-2 py-2 font-medium whitespace-nowrap"
                  scope="col"
                  aria-sort={sortKey === 'chrono' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('chrono')}
                    title="Year the decision was issued (not the Court term)"
                    className="cursor-pointer uppercase hover:text-ink"
                  >
                    Decided {sortKey === 'chrono' ? (sortDir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="hidden px-2 py-2 font-medium md:table-cell" scope="col">
                  Categories
                </th>
                <th className="w-8 px-2 py-2" aria-label="Expand" scope="col" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-accent-wash"
                  >
                    <td className="py-2.5 pr-1 pl-4 align-top text-xs text-ink3 tabular-nums">{c.index}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink3">{c.usCite}</p>
                    </td>
                    <td className="px-2 py-2.5 align-top text-ink2 tabular-nums">{decisionYear(c)}</td>
                    <td className="hidden px-2 py-2.5 md:table-cell">
                      <span className="text-xs text-ink2">{c.categories.join(' · ')}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center align-top">
                      <button
                        type="button"
                        aria-expanded={expanded === c.id}
                        aria-label={`${expanded === c.id ? 'Collapse' : 'Expand'} details for ${c.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpanded(expanded === c.id ? null : c.id)
                        }}
                        className="h-6 w-6 cursor-pointer rounded border border-hairline text-ink3 hover:bg-accent-wash hover:text-ink"
                      >
                        {expanded === c.id ? '−' : '+'}
                      </button>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="border-b border-hairline last:border-b-0">
                      <td colSpan={5} className="p-0">
                        <CaseDetail
                          kase={c}
                          onCategory={(cat) => {
                            setCategories([cat])
                            setPage(0)
                            window.scrollTo({ top: 0 })
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink3">
                    No cases match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-hairline px-4 py-2.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 not-disabled:hover:bg-accent-wash disabled:cursor-default disabled:opacity-40"
            >
              ← Previous
            </button>
            <PageJump page={safePage} pageCount={pageCount} onJump={setPage} />
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 not-disabled:hover:bg-accent-wash disabled:cursor-default disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
