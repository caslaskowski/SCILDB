import Papa from 'papaparse'
import { useMemo, useState } from 'react'
<<<<<<< HEAD
import { HBarList, StatTile } from '../components/charts'
import { FilterBar, MultiSelect, SearchBox, YearRange } from '../components/filters'
import {
  appointmentSort,
  authoredOpinion,
  decisionYear,
  formatNumber,
  useDataset,
  voteShortLabel,
} from '../lib/data'
import type { Case, Dataset, VoteRec } from '../types'
=======
import { ChartCard, DivergingBars, HBarList, StatTile } from '../components/charts'
import { FilterBar, MultiSelect, SearchBox, YearRange } from '../components/filters'
import { formatNumber, useDataset, voteAlignment, voteShortLabel } from '../lib/data'
import type { Case, VoteRec } from '../types'
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b

interface JusticeStats {
  justiceName: string
  fullName: string
  yearsCourt: string
<<<<<<< HEAD
  startYear: number | null
  appointed: number
=======
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
  cases: number
  inMajority: number
  dissents: number
  opinions: number
  majOpinions: number
<<<<<<< HEAD
}

type SortCol = 'name' | 'appointed' | 'cases' | 'majorityPct' | 'dissents' | 'opinions' | 'majOpinions'

export default function Justices() {
  const { data, error } = useDataset()
  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>
  if (!data) return <p className="py-16 text-center text-sm text-ink3">Loading the database…</p>
  return <JusticesView data={data} />
}

function JusticesView({ data }: { data: Dataset }) {
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [authorLabels, setAuthorLabels] = useState<string[]>([])
  const [yearFrom, setYearFrom] = useState(data.yearMin)
  const [yearTo, setYearTo] = useState(data.yearMax)
  const [sortCol, setSortCol] = useState<SortCol>('appointed')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [selected, setSelected] = useState<string | null>(null)

  const allCategories = useMemo(() => {
=======
  support: number
  oppose: number
}

type SortCol = 'name' | 'cases' | 'majorityPct' | 'dissents' | 'opinions' | 'majOpinions' | 'alignment'

export default function Justices() {
  const { data, error } = useDataset()

  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [yearFrom, setYearFrom] = useState(1810)
  const [yearTo, setYearTo] = useState(2023)
  const [sortCol, setSortCol] = useState<SortCol>('cases')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [selected, setSelected] = useState<string | null>(null)

  const allCategories = useMemo(() => {
    if (!data) return []
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
    const set = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) set.add(cat)
    return [...set].sort()
  }, [data])

  const caseMap = useMemo(() => {
    const map = new Map<string, Case>()
<<<<<<< HEAD
    for (const c of data.cases) map.set(c.id, c)
    return map
  }, [data])

  /** For each case, the set of justices who wrote or co-authored an opinion in it. */
  const opinionAuthorsByCase = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const v of data.votes) {
      if (!authoredOpinion(v)) continue
      const set = map.get(v.c) ?? new Set<string>()
      set.add(v.j)
      map.set(v.c, set)
    }
    return map
  }, [data])

  /**
   * Dropdown options for the opinion-author filter, ordered by appointment date.
   * Labels carry service years so namesakes (the two John Harlans, John
   * Rutledges, and Charles Hugheses) stay distinguishable.
   */
  const authorOptions = useMemo(() => {
    const authors = new Set<string>()
    for (const set of opinionAuthorsByCase.values()) for (const j of set) authors.add(j)
    const meta = new Map(data.justices.map((j) => [j.justiceName, j]))
    const rows = [...authors].map((jn) => {
      const j = meta.get(jn)
      return {
        justiceName: jn,
        label: j ? `${j.fullName} (${j.startYear ?? '?'}–${j.endYear ?? ''})` : jn,
        order: j ? appointmentSort(j) : Number.MAX_SAFE_INTEGER,
      }
    })
    rows.sort((a, b) => a.order - b.order)
    return {
      labels: rows.map((r) => r.label),
      byLabel: new Map(rows.map((r) => [r.label, r.justiceName])),
    }
  }, [data, opinionAuthorsByCase])

  const selectedAuthors = useMemo(
    () => new Set(authorLabels.map((label) => authorOptions.byLabel.get(label)).filter((j): j is string => j != null)),
    [authorLabels, authorOptions],
  )

  /** Cases in scope under the current category / year-decided / author filters. */
  const scopedCaseIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of data.cases) {
      const year = decisionYear(c)
      if (year < yearFrom || year > yearTo) continue
      if (categories.length > 0 && !categories.every((cat) => c.categories.includes(cat))) continue
      if (selectedAuthors.size > 0) {
        const authors = opinionAuthorsByCase.get(c.id)
        if (!authors || ![...selectedAuthors].some((j) => authors.has(j))) continue
      }
      ids.add(c.id)
    }
    return ids
  }, [data, categories, yearFrom, yearTo, selectedAuthors, opinionAuthorsByCase])

  const stats = useMemo(() => {
=======
    if (data) for (const c of data.cases) map.set(c.id, c)
    return map
  }, [data])

  /** Cases in scope under the current category/era filters. */
  const scopedCaseIds = useMemo(() => {
    if (!data) return new Set<string>()
    const ids = new Set<string>()
    for (const c of data.cases) {
      if (c.term != null && (c.term < yearFrom || c.term > yearTo)) continue
      if (categories.length > 0 && !categories.every((cat) => c.categories.includes(cat))) continue
      ids.add(c.id)
    }
    return ids
  }, [data, categories, yearFrom, yearTo])

  const stats = useMemo(() => {
    if (!data) return []
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
    const byJustice = new Map<string, JusticeStats>()
    const justiceMeta = new Map(data.justices.map((j) => [j.justiceName, j]))
    for (const v of data.votes) {
      if (!scopedCaseIds.has(v.c)) continue
      let s = byJustice.get(v.j)
      if (!s) {
        const meta = justiceMeta.get(v.j)
        s = {
          justiceName: v.j,
          fullName: meta?.fullName ?? v.j,
          yearsCourt: meta?.yearsCourt ?? '',
<<<<<<< HEAD
          startYear: meta?.startYear ?? null,
          appointed: meta ? appointmentSort(meta) : Number.MAX_SAFE_INTEGER,
=======
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
          cases: 0,
          inMajority: 0,
          dissents: 0,
          opinions: 0,
          majOpinions: 0,
<<<<<<< HEAD
=======
          support: 0,
          oppose: 0,
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
        }
        byJustice.set(v.j, s)
      }
      s.cases++
      if (v.m === 2) s.inMajority++
      if (v.m === 1) s.dissents++
      if (v.o === 2 || v.o === 3) s.opinions++
      if (v.w === 1) s.majOpinions++
<<<<<<< HEAD
    }
    return [...byJustice.values()]
  }, [data, scopedCaseIds])
=======
      const kase = caseMap.get(v.c)
      if (kase) {
        const align = voteAlignment(v, kase)
        if (align === 'support') s.support++
        if (align === 'oppose') s.oppose++
      }
    }
    return [...byJustice.values()]
  }, [data, scopedCaseIds, caseMap])
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q ? stats.filter((s) => s.fullName.toLowerCase().includes(q)) : [...stats]
    const value = (s: JusticeStats): number | string => {
      switch (sortCol) {
        case 'name':
          return s.fullName
<<<<<<< HEAD
        case 'appointed':
          return s.appointed
=======
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
        case 'cases':
          return s.cases
        case 'majorityPct':
          return s.cases ? s.inMajority / s.cases : 0
        case 'dissents':
          return s.dissents
        case 'opinions':
          return s.opinions
        case 'majOpinions':
          return s.majOpinions
<<<<<<< HEAD
=======
        case 'alignment':
          return s.support + s.oppose ? s.support / (s.support + s.oppose) : -1
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
      }
    }
    rows.sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * sortDir
      return (Number(va) - Number(vb)) * sortDir
    })
    return rows
  }, [stats, search, sortCol, sortDir])

<<<<<<< HEAD
  const selectedStats = selected ? stats.find((s) => s.justiceName === selected) : null

  const selectedVotes = useMemo(() => {
    if (!selected) return []
=======
  const divergingRows = useMemo(
    () =>
      [...visible]
        .filter((s) => s.support + s.oppose > 0)
        .sort((a, b) => b.support + b.oppose - (a.support + a.oppose))
        .slice(0, 20)
        .map((s) => ({
          key: s.justiceName,
          label: s.fullName,
          left: s.oppose,
          right: s.support,
        })),
    [visible],
  )

  const selectedStats = selected ? stats.find((s) => s.justiceName === selected) : null

  const selectedVotes = useMemo(() => {
    if (!data || !selected) return []
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
    return data.votes
      .filter((v) => v.j === selected && scopedCaseIds.has(v.c))
      .map((v) => ({ vote: v, kase: caseMap.get(v.c) }))
      .filter((x): x is { vote: VoteRec; kase: Case } => x.kase != null)
      .sort((a, b) => a.kase.sortDate - b.kase.sortDate)
  }, [data, selected, scopedCaseIds, caseMap])

  // Categories across the selected justice's cases; redundant (and hidden)
  // when the view is already filtered to a single category.
  const selectedCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { kase } of selectedVotes)
      for (const cat of kase.categories) counts.set(cat, (counts.get(cat) ?? 0) + 1)
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [selectedVotes])

<<<<<<< HEAD
  const filtersActive =
    search !== '' || categories.length > 0 || authorLabels.length > 0 || yearFrom !== data.yearMin || yearTo !== data.yearMax
=======
  const filtersActive = search !== '' || categories.length > 0 || yearFrom !== 1810 || yearTo !== 2023
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
<<<<<<< HEAD
      setSortDir(col === 'name' || col === 'appointed' ? 1 : -1)
=======
      setSortDir(col === 'name' ? 1 : -1)
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
    }
  }

  const exportCsv = () => {
    const rows = visible.map((s) => ({
      justice: s.fullName,
      yearsOnCourt: s.yearsCourt,
      casesParticipated: s.cases,
      inMajority: s.inMajority,
      dissents: s.dissents,
      opinionsWritten: s.opinions,
      majorityOpinionsAuthored: s.majOpinions,
<<<<<<< HEAD
=======
      votesSupportingNativeParty: s.support,
      votesOpposingNativeParty: s.oppose,
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
    }))
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'scildb_justices_filtered.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

<<<<<<< HEAD
=======
  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>
  if (!data) return <p className="py-16 text-center text-sm text-ink3">Loading the database…</p>

>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
  const th = (label: string, col: SortCol, extra = '') => (
    <th
      className={`px-2 py-2 font-medium whitespace-nowrap ${extra}`}
      aria-sort={sortCol === col ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => toggleSort(col)} className="cursor-pointer uppercase hover:text-ink">
        {label} {sortCol === col ? (sortDir === 1 ? '↑' : '↓') : ''}
      </button>
    </th>
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Justices</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
<<<<<<< HEAD
          Voting records of every justice who participated in the Court's Indian law docket, listed in order
          of appointment to the Court. Filter by case category, the year a decision was issued, or which
          justices authored an opinion; click any justice for their full case-by-case record.
=======
          Voting records of every justice who participated in the Court's Indian law docket. “Sided with /
          against the Native party” counts a vote as siding with the Native party when the justice joined a
          favorable majority or dissented from an unfavorable one, in the{' '}
          {formatNumber(data.cases.filter((c) => c.disposition === 'Favorable' || c.disposition === 'Unfavorable').length)}{' '}
          cases where the Supreme Court Database codes a Native party and a clear winner.
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
        </p>
      </header>

      <FilterBar
        onClear={() => {
          setSearch('')
          setCategories([])
<<<<<<< HEAD
          setAuthorLabels([])
          setYearFrom(data.yearMin)
          setYearTo(data.yearMax)
=======
          setYearFrom(1810)
          setYearTo(2023)
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
        }}
        active={filtersActive}
      >
        <SearchBox label="Search justice" value={search} onChange={setSearch} placeholder="e.g. Marshall" width="w-56" />
        <MultiSelect label="Case categories" options={allCategories} selected={categories} onChange={setCategories} />
<<<<<<< HEAD
        <MultiSelect
          label="Opinion authored by"
          options={authorOptions.labels}
          selected={authorLabels}
          onChange={setAuthorLabels}
          placeholder="Any justice"
        />
        <YearRange
          label="Year decided"
          min={data.yearMin}
          max={data.yearMax}
=======
        <YearRange
          label="Court term"
          min={data.meta.termMin}
          max={data.meta.termMax}
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
          from={yearFrom}
          to={yearTo}
          onChange={(f, t) => {
            setYearFrom(f)
            setYearTo(t)
          }}
        />
      </FilterBar>

<<<<<<< HEAD
      {authorLabels.length > 0 && (
        <p className="mb-4 rounded-md border border-accent/40 bg-accent-wash px-3 py-2 text-xs text-ink2">
          Limited to the {formatNumber(scopedCaseIds.size)} case{scopedCaseIds.size === 1 ? '' : 's'} with an
          opinion, concurrence, or dissent authored by{' '}
          <span className="font-semibold text-ink">{authorLabels.join(' or ')}</span>.
        </p>
      )}

      {selectedStats && (
        <section className="mt-2 mb-6 rounded-lg border border-accent/40 bg-surface p-4">
=======
      <ChartCard
        title="Votes for and against the Native party"
        subtitle="The 20 justices with the most alignment-codable votes under the current filter — click a justice for their full record"
      >
        <DivergingBars
          rows={divergingRows}
          leftLabel="Sided against"
          rightLabel="Sided with"
          selectedKey={selected}
          onClickRow={(key) => setSelected(key === selected ? null : key)}
        />
      </ChartCard>

      {selectedStats && (
        <section className="mt-6 rounded-lg border border-accent/40 bg-surface p-4">
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">{selectedStats.fullName}</h2>
              <p className="text-xs text-ink3">On the Court {selectedStats.yearsCourt}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 hover:bg-accent-wash"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Cases (in filter)" value={formatNumber(selectedStats.cases)} />
            <StatTile
              label="In the majority"
              value={selectedStats.cases ? `${Math.round((selectedStats.inMajority / selectedStats.cases) * 100)}%` : '—'}
              detail={`${formatNumber(selectedStats.inMajority)} votes`}
            />
            <StatTile label="Dissents" value={formatNumber(selectedStats.dissents)} />
            <StatTile label="Opinions written" value={formatNumber(selectedStats.opinions)} />
            <StatTile label="Majority opinions" value={formatNumber(selectedStats.majOpinions)} />
          </div>
          {categories.length !== 1 && selectedCategories.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-xs font-semibold text-ink">
                Categories of the cases {selectedStats.fullName} voted on
              </h3>
              <HBarList items={selectedCategories} />
            </div>
          )}
          <div className="mt-4 max-h-96 overflow-auto rounded-md border border-hairline">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-hairline text-[11px] text-ink3 uppercase">
                  <th className="px-3 py-2 font-medium">Case</th>
<<<<<<< HEAD
                  <th className="px-2 py-2 font-medium" title="Year the decision was issued">
                    Decided
                  </th>
                  <th className="px-2 py-2 font-medium">Vote</th>
                </tr>
              </thead>
              <tbody>
                {selectedVotes.map(({ vote, kase }) => (
                  <tr key={kase.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-3 py-1.5">
                      <p className="text-ink">{kase.name}</p>
                      <p className="text-xs text-ink3">{kase.usCite}</p>
                    </td>
                    <td className="px-2 py-1.5 text-ink2 tabular-nums">{decisionYear(kase)}</td>
                    <td className="px-2 py-1.5 text-xs text-ink2">
                      {voteShortLabel(vote.v)}
                      {vote.w === 1 ? ' · wrote the opinion' : (vote.o === 2 || vote.o === 3) ? ' · wrote an opinion' : ''}
                    </td>
                  </tr>
                ))}
=======
                  <th className="px-2 py-2 font-medium">Term</th>
                  <th className="px-2 py-2 font-medium">Vote</th>
                  <th className="px-2 py-2 font-medium whitespace-nowrap">Native party</th>
                </tr>
              </thead>
              <tbody>
                {selectedVotes.map(({ vote, kase }) => {
                  const align = voteAlignment(vote, kase)
                  return (
                    <tr key={kase.id} className="border-b border-hairline last:border-b-0">
                      <td className="px-3 py-1.5">
                        <p className="text-ink">{kase.name}</p>
                        <p className="text-xs text-ink3">{kase.usCite}</p>
                      </td>
                      <td className="px-2 py-1.5 text-ink2 tabular-nums">{kase.term}</td>
                      <td className="px-2 py-1.5 text-xs text-ink2">
                        {voteShortLabel(vote.v)}
                        {vote.w === 1 ? ' · wrote the opinion' : (vote.o === 2 || vote.o === 3) ? ' · wrote an opinion' : ''}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {align === 'support' && (
                          <span className="flex items-center gap-1.5 text-ink2">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: 'var(--viz-pos)' }} />
                            Sided with
                          </span>
                        )}
                        {align === 'oppose' && (
                          <span className="flex items-center gap-1.5 text-ink2">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: 'var(--viz-neg)' }} />
                            Sided against
                          </span>
                        )}
                        {align === null && <span className="text-ink3">—</span>}
                      </td>
                    </tr>
                  )
                })}
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
              </tbody>
            </table>
          </div>
        </section>
      )}

<<<<<<< HEAD
      <section className="overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
          <p className="text-xs text-ink3">
            {formatNumber(visible.length)} justice{visible.length === 1 ? '' : 's'}, in order of appointment ·
            click a row for the full record
=======
      <section className="mt-6 overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
          <p className="text-xs text-ink3">
            {formatNumber(visible.length)} justice{visible.length === 1 ? '' : 's'} · click a row for the full record
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
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
                {th('Justice', 'name', 'pl-4')}
<<<<<<< HEAD
                {th('Appointed', 'appointed')}
=======
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
                {th('Cases', 'cases')}
                {th('In majority', 'majorityPct')}
                {th('Dissents', 'dissents')}
                {th('Opinions', 'opinions')}
                {th('Maj. opinions', 'majOpinions')}
<<<<<<< HEAD
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.justiceName}
                  onClick={() => setSelected(s.justiceName === selected ? null : s.justiceName)}
                  className={`cursor-pointer border-b border-hairline last:border-b-0 hover:bg-accent-wash ${
                    selected === s.justiceName ? 'bg-accent-wash' : ''
                  }`}
                >
                  <td className="py-2 pr-2 pl-4">
                    <button
                      type="button"
                      aria-expanded={selected === s.justiceName}
                      aria-label={`${selected === s.justiceName ? 'Close' : 'Show'} full record for ${s.fullName}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(s.justiceName === selected ? null : s.justiceName)
                      }}
                      className="cursor-pointer text-left"
                    >
                      <span className="block font-medium text-ink">{s.fullName}</span>
                      <span className="block text-xs text-ink3">{s.yearsCourt}</span>
                    </button>
                  </td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">{s.startYear ?? '—'}</td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.cases)}</td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">
                    {s.cases ? `${Math.round((s.inMajority / s.cases) * 100)}%` : '—'}
                  </td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.dissents)}</td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.opinions)}</td>
                  <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.majOpinions)}</td>
                </tr>
              ))}
=======
                {th('With Native party', 'alignment')}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const total = s.support + s.oppose
                return (
                  <tr
                    key={s.justiceName}
                    onClick={() => setSelected(s.justiceName === selected ? null : s.justiceName)}
                    className={`cursor-pointer border-b border-hairline last:border-b-0 hover:bg-accent-wash ${
                      selected === s.justiceName ? 'bg-accent-wash' : ''
                    }`}
                  >
                    <td className="py-2 pr-2 pl-4">
                      <button
                        type="button"
                        aria-expanded={selected === s.justiceName}
                        aria-label={`${selected === s.justiceName ? 'Close' : 'Show'} full record for ${s.fullName}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(s.justiceName === selected ? null : s.justiceName)
                        }}
                        className="cursor-pointer text-left"
                      >
                        <span className="block font-medium text-ink">{s.fullName}</span>
                        <span className="block text-xs text-ink3">{s.yearsCourt}</span>
                      </button>
                    </td>
                    <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.cases)}</td>
                    <td className="px-2 py-2 text-ink2 tabular-nums">
                      {s.cases ? `${Math.round((s.inMajority / s.cases) * 100)}%` : '—'}
                    </td>
                    <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.dissents)}</td>
                    <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.opinions)}</td>
                    <td className="px-2 py-2 text-ink2 tabular-nums">{formatNumber(s.majOpinions)}</td>
                    <td className="px-2 py-2">
                      {total > 0 ? (
                        <span className="flex items-center gap-2">
                          <span className="relative h-2.5 w-24 overflow-hidden rounded-full bg-viztrack" aria-hidden="true">
                            <span
                              className="absolute inset-y-0 left-0"
                              style={{ width: `${(s.support / total) * 100}%`, background: 'var(--viz-pos)' }}
                            />
                            <span
                              className="absolute inset-y-0 right-0"
                              style={{ width: `${(s.oppose / total) * 100}%`, background: 'var(--viz-neg)' }}
                            />
                          </span>
                          <span className="text-xs text-ink2 tabular-nums">
                            {s.support}–{s.oppose}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-ink3">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
>>>>>>> 0f4abf6a32924ee241d819fa63d5487cc3c56e2b
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink3">
                    No justices match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
