import Papa from 'papaparse'
import { Fragment, useMemo, useState } from 'react'
import { ChartCard, DecadeColumns, HBarList, StatTile } from '../components/charts'
import { FilterBar, MultiSelect, SearchBox, SelectBox, YearRange } from '../components/filters'
import { decadeOf, DISPOSITIONS, formatNumber, useDataset } from '../lib/data'
import type { Case, Disposition } from '../types'

const PAGE_SIZE = 25

const DISPOSITION_COLOR: Record<Disposition, string> = {
  Favorable: 'var(--viz-pos)',
  Unfavorable: 'var(--viz-neg)',
  Unclear: 'var(--viz-mid)',
  'No coded Native party': 'var(--viz-mid)',
}

function DispositionBadge({ disposition }: { disposition: Disposition }) {
  const short = disposition === 'No coded Native party' ? 'No coded party' : disposition
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink2" title={`Disposition for the Native party: ${disposition}`}>
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: DISPOSITION_COLOR[disposition] }}
      />
      {short}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink3">{label}</dt>
      <dd className="m-0 text-sm text-ink2">{children}</dd>
    </div>
  )
}

function CaseDetail({ kase }: { kase: Case }) {
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
            <span key={cat} className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs text-ink2">
              {cat}
            </span>
          ))}
        </dd>
      </div>
      {(kase.url || kase.briefs.length > 0) && (
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-[11px] font-medium text-ink3">Primary sources</dt>
          <dd className="m-0 mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {kase.url && (
              <a href={kase.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Opinion on CourtListener ↗
              </a>
            )}
            {kase.briefs.slice(0, 4).map((brief) => (
              <a key={brief.url} href={brief.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Briefs & record (Internet Archive) ↗
              </a>
            ))}
          </dd>
        </div>
      )}
    </div>
  )
}

export default function Cases() {
  const { data, error } = useDataset()

  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [disposition, setDisposition] = useState('')
  const [chief, setChief] = useState('')
  const [yearFrom, setYearFrom] = useState(1810)
  const [yearTo, setYearTo] = useState(2023)
  const [sortKey, setSortKey] = useState<'term' | 'name'>('term')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const allCategories = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) set.add(cat)
    return [...set].sort()
  }, [data])

  const allChiefs = useMemo(() => {
    if (!data) return []
    const seen: string[] = []
    for (const c of data.cases) {
      if (c.chief && !seen.includes(c.chief)) seen.push(c.chief)
    }
    return seen
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.cases.filter((c) => {
      if (c.term != null && (c.term < yearFrom || c.term > yearTo)) return false
      if (disposition && c.disposition !== disposition) return false
      if (chief && c.chief !== chief) return false
      if (categories.length > 0 && !categories.every((cat) => c.categories.includes(cat))) return false
      if (q) {
        const hay = `${c.name} ${c.usCite ?? ''} ${c.tribes.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, search, categories, disposition, chief, yearFrom, yearTo])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sortKey === 'term') return ((a.term ?? 0) - (b.term ?? 0)) * sortDir
      return a.name.localeCompare(b.name) * sortDir
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const byDecade = useMemo(() => {
    const counts = new Map<number, { Favorable: number; Unfavorable: number; other: number }>()
    for (const c of filtered) {
      if (c.term == null) continue
      const d = decadeOf(c.term)
      const row = counts.get(d) ?? { Favorable: 0, Unfavorable: 0, other: 0 }
      if (c.disposition === 'Favorable') row.Favorable++
      else if (c.disposition === 'Unfavorable') row.Unfavorable++
      else row.other++
      counts.set(d, row)
    }
    if (counts.size === 0) return []
    const decades = [...counts.keys()]
    const min = Math.min(...decades)
    const max = Math.max(...decades)
    const rows = []
    for (let d = min; d <= max; d += 10) {
      const row = counts.get(d) ?? { Favorable: 0, Unfavorable: 0, other: 0 }
      rows.push({ decade: d, ...row })
    }
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

  const dispositionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of filtered) counts[c.disposition] = (counts[c.disposition] ?? 0) + 1
    return counts
  }, [filtered])

  const filtersActive =
    search !== '' || categories.length > 0 || disposition !== '' || chief !== '' || yearFrom !== 1810 || yearTo !== 2023

  const clearFilters = () => {
    setSearch('')
    setCategories([])
    setDisposition('')
    setChief('')
    setYearFrom(1810)
    setYearTo(2023)
    setPage(0)
  }

  const setFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const toggleSort = (key: 'term' | 'name') => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const exportCsv = () => {
    const rows = sorted.map((c) => ({
      case: c.name,
      citation: c.usCite,
      term: c.term,
      decided: c.dateDecision,
      categories: c.categories.join('; '),
      tribes: c.tribes.join('; '),
      petitioner: c.petitioner,
      respondent: c.respondent,
      dispositionForNativeParty: c.disposition,
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

  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>
  if (!data) return <p className="py-16 text-center text-sm text-ink3">Loading the database…</p>

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Cases</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          Every federal Indian law case decided by the Supreme Court, {data.meta.termMin}–{data.meta.termMax}.
          Filter by topic, era, or outcome; the charts and table below update together. “Disposition” reflects
          whether the Court's judgment favored the Native party, where the Supreme Court Database codes one.
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
        <SelectBox
          label="Disposition for Native party"
          value={disposition}
          onChange={setFilter(setDisposition)}
          options={[...DISPOSITIONS]}
        />
        <SelectBox label="Chief Justice era" value={chief} onChange={setFilter(setChief)} options={allChiefs} />
        <YearRange
          label="Term"
          min={data.meta.termMin}
          max={data.meta.termMax}
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
        <StatTile label="Favorable to Native party" value={formatNumber(dispositionCounts['Favorable'] ?? 0)} />
        <StatTile label="Unfavorable" value={formatNumber(dispositionCounts['Unfavorable'] ?? 0)} />
        <StatTile
          label="No coded Native party"
          value={formatNumber((dispositionCounts['No coded Native party'] ?? 0) + (dispositionCounts['Unclear'] ?? 0))}
          detail="incl. unclear dispositions"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Cases by decade and disposition"
          subtitle="Stacked by how the judgment fell for the Native party"
          legend={[
            { label: 'Favorable', color: 'var(--viz-pos)' },
            { label: 'Unfavorable', color: 'var(--viz-neg)' },
            { label: 'No coded party / unclear', color: 'var(--viz-mid)' },
          ]}
        >
          <DecadeColumns
            data={byDecade}
            series={[
              { key: 'Favorable', label: 'Favorable', color: 'var(--viz-pos)' },
              { key: 'Unfavorable', label: 'Unfavorable', color: 'var(--viz-neg)' },
              { key: 'other', label: 'No coded party / unclear', color: 'var(--viz-mid)' },
            ]}
          />
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
                <th className="px-4 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('name')} className="cursor-pointer uppercase hover:text-ink">
                    Case {sortKey === 'name' ? (sortDir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('term')} className="cursor-pointer uppercase hover:text-ink">
                    Term {sortKey === 'term' ? (sortDir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">Categories</th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">Disposition</th>
                <th className="w-8 px-2 py-2" aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-accent-wash"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink3">{c.usCite}</p>
                    </td>
                    <td className="px-2 py-2.5 text-ink2 tabular-nums">{c.term}</td>
                    <td className="hidden max-w-72 px-2 py-2.5 md:table-cell">
                      <span className="line-clamp-2 text-xs text-ink2">{c.categories.join(' · ')}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <DispositionBadge disposition={c.disposition} />
                    </td>
                    <td className="px-2 py-2.5 text-center text-ink3">{expanded === c.id ? '−' : '+'}</td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="border-b border-hairline last:border-b-0">
                      <td colSpan={5} className="p-0">
                        <CaseDetail kase={c} />
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
          <div className="flex items-center justify-center gap-2 border-t border-hairline px-4 py-2.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 not-disabled:hover:bg-accent-wash disabled:cursor-default disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs text-ink3">
              {safePage + 1} / {pageCount}
            </span>
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
