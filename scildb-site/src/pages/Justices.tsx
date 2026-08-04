import Papa from 'papaparse'
import { Fragment, useCallback, useMemo, useState } from 'react'
import CaseDetail from '../components/CaseDetail'
import { HBarList, StatTile } from '../components/charts'
import { FilterBar, MultiSelect, SearchBox, YearRange } from '../components/filters'
import {
  OPINION_TYPES,
  appointmentSort,
  authoredOpinion,
  authoredOpinionType,
  decisionYear,
  formatNumber,
  useDataset,
  voteShortLabel,
} from '../lib/data'
import type { OpinionType } from '../lib/data'
import { getHashQuery } from '../lib/router'
import type { Case, Dataset, VoteRec } from '../types'

interface JusticeStats {
  justiceName: string
  fullName: string
  yearsCourt: string
  startYear: number | null
  appointed: number
  cases: number
  inMajority: number
  dissents: number
  opinions: number
  majOpinions: number
  concurOpinions: number
  dissentOpinions: number
  /** Count of this justice's votes by vote code (see meta.voteLabels). */
  voteCounts: Record<number, number>
}

/** The authored-opinion stat tiles on the justice card, in display order. */
const OPINION_TILES: { type: OpinionType; label: string }[] = [
  { type: 'Majority opinion', label: 'Majority opinions' },
  { type: 'Concurrence', label: 'Concurrences' },
  { type: 'Dissent', label: 'Dissenting opinions' },
]

type SortCol = 'name' | 'appointed' | 'cases' | 'majorityPct' | 'dissents' | 'opinions' | 'majOpinions'

export default function Justices() {
  const { data, error } = useDataset()
  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>
  if (!data) return <p className="py-16 text-center text-sm text-ink3">Loading the database…</p>
  return <JusticesView data={data} />
}

function JusticesView({ data }: { data: Dataset }) {
  // Seeded from the URL hash, e.g. "#/justices?j=JHarlan1" from the home-page
  // top-10 chart: filters the table to that justice and opens their record.
  const [initialQuery] = useState(getHashQuery)
  const initialJustice = useMemo(() => {
    const j = initialQuery.get('j')
    return j && data.justices.some((x) => x.justiceName === j) ? j : null
  }, [initialQuery, data])

  const [search, setSearch] = useState(() => {
    if (!initialJustice) return ''
    return data.justices.find((x) => x.justiceName === initialJustice)?.fullName ?? ''
  })
  const [categories, setCategories] = useState<string[]>([])
  const [authorLabels, setAuthorLabels] = useState<string[]>([])
  const [opinionTypes, setOpinionTypes] = useState<string[]>([])
  const [voteTypes, setVoteTypes] = useState<string[]>([])
  const [yearFrom, setYearFrom] = useState(data.yearMin)
  const [yearTo, setYearTo] = useState(data.yearMax)
  const [sortCol, setSortCol] = useState<SortCol>('appointed')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [selected, setSelected] = useState<string | null>(initialJustice)
  const [expandedCase, setExpandedCase] = useState<string | null>(null)

  const selectJustice = (justiceName: string | null) => {
    setSelected(justiceName)
    setExpandedCase(null)
  }

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) set.add(cat)
    return [...set].sort()
  }, [data])

  const caseMap = useMemo(() => {
    const map = new Map<string, Case>()
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
      byJustice: new Map(rows.map((r) => [r.justiceName, r.label])),
    }
  }, [data, opinionAuthorsByCase])

  const selectedAuthors = useMemo(
    () => new Set(authorLabels.map((label) => authorOptions.byLabel.get(label)).filter((j): j is string => j != null)),
    [authorLabels, authorOptions],
  )

  /** Options for the "Vote" filter: every vote code present in the data, in code order. */
  const voteOptions = useMemo(() => {
    const codes = new Set<number>()
    for (const v of data.votes) if (v.v != null) codes.add(v.v)
    const sorted = [...codes].sort((a, b) => a - b)
    return {
      labels: sorted.map(voteShortLabel),
      byLabel: new Map(sorted.map((c) => [voteShortLabel(c), c])),
    }
  }, [data])

  const selectedVoteCodes = useMemo(
    () => new Set(voteTypes.map((label) => voteOptions.byLabel.get(label)).filter((c): c is number => c != null)),
    [voteTypes, voteOptions],
  )

  const selectedOpinionTypes = useMemo(() => new Set(opinionTypes), [opinionTypes])

  /**
   * Vote-level filters. Unlike the case filters above (which decide *which
   * cases* are in scope), these decide *which of a justice's votes* count:
   * every justice's statistics and case list include only votes that match.
   */
  const voteInScope = useCallback(
    (v: VoteRec): boolean => {
      if (selectedVoteCodes.size > 0 && (v.v == null || !selectedVoteCodes.has(v.v))) return false
      if (selectedOpinionTypes.size > 0) {
        const type = authoredOpinionType(v)
        if (type == null || !selectedOpinionTypes.has(type)) return false
      }
      return true
    },
    [selectedVoteCodes, selectedOpinionTypes],
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
    const byJustice = new Map<string, JusticeStats>()
    const justiceMeta = new Map(data.justices.map((j) => [j.justiceName, j]))
    for (const v of data.votes) {
      if (!scopedCaseIds.has(v.c)) continue
      if (!voteInScope(v)) continue
      let s = byJustice.get(v.j)
      if (!s) {
        const meta = justiceMeta.get(v.j)
        s = {
          justiceName: v.j,
          fullName: meta?.fullName ?? v.j,
          yearsCourt: meta?.yearsCourt ?? '',
          startYear: meta?.startYear ?? null,
          appointed: meta ? appointmentSort(meta) : Number.MAX_SAFE_INTEGER,
          cases: 0,
          inMajority: 0,
          dissents: 0,
          opinions: 0,
          majOpinions: 0,
          concurOpinions: 0,
          dissentOpinions: 0,
          voteCounts: {},
        }
        byJustice.set(v.j, s)
      }
      s.cases++
      if (v.m === 2) s.inMajority++
      if (v.m === 1) s.dissents++
      const opType = authoredOpinionType(v)
      if (opType != null) {
        s.opinions++
        if (opType === 'Majority opinion') s.majOpinions++
        else if (opType === 'Concurrence') s.concurOpinions++
        else s.dissentOpinions++
      }
      if (v.v != null) s.voteCounts[v.v] = (s.voteCounts[v.v] ?? 0) + 1
    }
    return [...byJustice.values()]
  }, [data, scopedCaseIds, voteInScope])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q ? stats.filter((s) => s.fullName.toLowerCase().includes(q)) : [...stats]
    const value = (s: JusticeStats): number | string => {
      switch (sortCol) {
        case 'name':
          return s.fullName
        case 'appointed':
          return s.appointed
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

  const selectedStats = selected ? stats.find((s) => s.justiceName === selected) : null

  const selectedVotes = useMemo(() => {
    if (!selected) return []
    return data.votes
      .filter((v) => v.j === selected && scopedCaseIds.has(v.c) && voteInScope(v))
      .map((v) => ({ vote: v, kase: caseMap.get(v.c) }))
      .filter((x): x is { vote: VoteRec; kase: Case } => x.kase != null)
      .sort((a, b) => a.kase.sortDate - b.kase.sortDate)
  }, [data, selected, scopedCaseIds, caseMap, voteInScope])

  /** The selected justice's vote-code breakdown, in code order, for the card's vote line. */
  const selectedVoteBreakdown = useMemo(() => {
    const s = selected ? stats.find((x) => x.justiceName === selected) : null
    if (!s) return []
    return Object.entries(s.voteCounts)
      .map(([code, count]) => ({ code: Number(code), count }))
      .sort((a, b) => a.code - b.code)
  }, [selected, stats])

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

  /** The author-filter label for the selected justice, if they authored any opinions. */
  const selectedAuthorLabel = selected ? (authorOptions.byJustice.get(selected) ?? null) : null

  const filtersActive =
    search !== '' ||
    categories.length > 0 ||
    authorLabels.length > 0 ||
    opinionTypes.length > 0 ||
    voteTypes.length > 0 ||
    yearFrom !== data.yearMin ||
    yearTo !== data.yearMax

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
      setSortDir(col === 'name' || col === 'appointed' ? 1 : -1)
    }
  }

  const exportCsv = () => {
    const rows = visible.map((s) => ({
      justice: s.fullName,
      yearsOnCourt: s.yearsCourt,
      casesParticipated: s.cases,
      inMajority: s.inMajority,
      dissents: s.dissents,
      opinionsAuthored: s.opinions,
      majorityOpinionsAuthored: s.majOpinions,
      concurrencesAuthored: s.concurOpinions,
      dissentingOpinionsAuthored: s.dissentOpinions,
    }))
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'scildb_justices_filtered.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

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
          Voting records of every justice who participated in the Court's Indian law docket, listed in order
          of appointment to the Court. Filter by case category, the year a decision was issued, or which
          justices authored an opinion; click any justice for their full case-by-case record.
        </p>
      </header>

      <FilterBar
        onClear={() => {
          setSearch('')
          setCategories([])
          setAuthorLabels([])
          setOpinionTypes([])
          setVoteTypes([])
          setYearFrom(data.yearMin)
          setYearTo(data.yearMax)
        }}
        active={filtersActive}
      >
        <SearchBox label="Search justice" value={search} onChange={setSearch} placeholder="e.g. Marshall" width="w-56" />
        <MultiSelect label="Case categories" options={allCategories} selected={categories} onChange={setCategories} />
        <MultiSelect
          label="Opinion authored by"
          options={authorOptions.labels}
          selected={authorLabels}
          onChange={setAuthorLabels}
          placeholder="Any justice"
        />
        <MultiSelect
          label="Opinion type authored"
          options={OPINION_TYPES}
          selected={opinionTypes}
          onChange={setOpinionTypes}
          placeholder="Any type"
        />
        <MultiSelect
          label="Vote"
          options={voteOptions.labels}
          selected={voteTypes}
          onChange={setVoteTypes}
          placeholder="Any vote"
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
          }}
        />
      </FilterBar>

      {authorLabels.length > 0 && (
        <p className="mb-4 rounded-md border border-accent/40 bg-accent-wash px-3 py-2 text-xs text-ink2">
          Limited to the {formatNumber(scopedCaseIds.size)} case{scopedCaseIds.size === 1 ? '' : 's'} with an
          opinion, concurrence, or dissent authored by{' '}
          <span className="font-semibold text-ink">{authorLabels.join(' or ')}</span>.
        </p>
      )}

      {(opinionTypes.length > 0 || voteTypes.length > 0) && (
        <p className="mb-4 rounded-md border border-accent/40 bg-accent-wash px-3 py-2 text-xs text-ink2">
          Each justice's numbers count only votes
          {opinionTypes.length > 0 && (
            <>
              {' '}
              where they authored a{' '}
              <span className="font-semibold text-ink">{opinionTypes.join(' or ').toLowerCase()}</span>
            </>
          )}
          {opinionTypes.length > 0 && voteTypes.length > 0 && ' and'}
          {voteTypes.length > 0 && (
            <>
              {' '}
              recorded as <span className="font-semibold text-ink">{voteTypes.join(' or ')}</span>
            </>
          )}
          .
        </p>
      )}

      {selectedStats && (
        <section className="mt-2 mb-6 rounded-lg border border-accent/40 bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">{selectedStats.fullName}</h2>
              <p className="text-xs text-ink3">On the Court {selectedStats.yearsCourt}</p>
            </div>
            <button
              type="button"
              onClick={() => selectJustice(null)}
              className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 text-xs text-ink2 hover:bg-accent-wash"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Cases (in filter)" value={formatNumber(selectedStats.cases)} />
            <StatTile
              label="Opinions authored"
              value={formatNumber(selectedStats.opinions)}
              detail={
                selectedAuthorLabel
                  ? authorLabels.includes(selectedAuthorLabel)
                    ? 'filtering — click to clear'
                    : 'click to filter to these cases'
                  : undefined
              }
              title={
                selectedAuthorLabel
                  ? `Toggle the "Opinion authored by" filter for ${selectedStats.fullName}`
                  : undefined
              }
              active={selectedAuthorLabel != null && authorLabels.includes(selectedAuthorLabel)}
              onClick={
                selectedAuthorLabel
                  ? () =>
                      setAuthorLabels(
                        authorLabels.includes(selectedAuthorLabel) ? [] : [selectedAuthorLabel],
                      )
                  : undefined
              }
            />
            {OPINION_TILES.map(({ type, label }) => {
              const count =
                type === 'Majority opinion'
                  ? selectedStats.majOpinions
                  : type === 'Concurrence'
                    ? selectedStats.concurOpinions
                    : selectedStats.dissentOpinions
              const active = opinionTypes.includes(type)
              const clickable = active || count > 0
              return (
                <StatTile
                  key={type}
                  label={label}
                  value={formatNumber(count)}
                  detail={active ? 'filtering — click to clear' : clickable ? 'click to filter by opinion type' : undefined}
                  title={clickable ? `Toggle the "Opinion type authored" filter: ${type}` : undefined}
                  active={active}
                  onClick={
                    clickable
                      ? () =>
                          setOpinionTypes(
                            active ? opinionTypes.filter((t) => t !== type) : [...opinionTypes, type],
                          )
                      : undefined
                  }
                />
              )
            })}
          </div>
          {selectedVoteBreakdown.length > 0 && (
            <p className="mt-3 text-sm text-ink2">
              <span className="text-xs text-ink3 uppercase">Votes: </span>
              {selectedVoteBreakdown.map(({ code, count }, i) => {
                const active = voteTypes.includes(voteShortLabel(code))
                return (
                  <Fragment key={code}>
                    {i > 0 && <span className="text-ink3"> · </span>}
                    <button
                      type="button"
                      aria-pressed={active}
                      title={`Toggle the "Vote" filter: ${voteShortLabel(code)}`}
                      onClick={() => {
                        const label = voteShortLabel(code)
                        setVoteTypes(
                          active ? voteTypes.filter((t) => t !== label) : [...voteTypes, label],
                        )
                      }}
                      className={`cursor-pointer rounded px-1 hover:bg-accent-wash hover:underline ${
                        active ? 'bg-accent-wash font-semibold text-ink' : ''
                      }`}
                    >
                      {voteShortLabel(code)} <span className="tabular-nums">{formatNumber(count)}</span>
                    </button>
                  </Fragment>
                )
              })}
              <span className="text-xs text-ink3">
                {' '}
                — in the majority{' '}
                {selectedStats.cases
                  ? `${Math.round((selectedStats.inMajority / selectedStats.cases) * 100)}%`
                  : '—'}{' '}
                of these cases · click a vote type to filter
              </span>
            </p>
          )}
          {categories.length !== 1 && selectedCategories.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-xs font-semibold text-ink">
                Categories of the cases {selectedStats.fullName} voted on — click a category to filter
              </h3>
              <HBarList
                items={selectedCategories}
                onClickItem={(label) => {
                  if (!categories.includes(label)) setCategories([...categories, label])
                }}
              />
            </div>
          )}
          <div className="mt-4 max-h-96 overflow-auto rounded-md border border-hairline">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-hairline text-[11px] text-ink3 uppercase">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Case
                  </th>
                  <th className="px-2 py-2 font-medium" scope="col" title="Year the decision was issued">
                    Decided
                  </th>
                  <th className="px-2 py-2 font-medium" scope="col">
                    Vote
                  </th>
                  <th className="w-8 px-2 py-2" aria-label="Expand" scope="col" />
                </tr>
              </thead>
              <tbody>
                {selectedVotes.map(({ vote, kase }) => (
                  <Fragment key={kase.id}>
                    <tr
                      onClick={() => setExpandedCase(expandedCase === kase.id ? null : kase.id)}
                      className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-accent-wash"
                    >
                      <td className="px-3 py-1.5">
                        <p className="text-ink">{kase.name}</p>
                        <p className="text-xs text-ink3">{kase.usCite}</p>
                      </td>
                      <td className="px-2 py-1.5 align-top text-ink2 tabular-nums">{decisionYear(kase)}</td>
                      <td className="px-2 py-1.5 align-top text-xs text-ink2">
                        {voteShortLabel(vote.v)}
                        {vote.w === 1 ? ' · wrote the opinion' : (vote.o === 2 || vote.o === 3) ? ' · wrote an opinion' : ''}
                      </td>
                      <td className="px-2 py-1.5 text-center align-top">
                        <button
                          type="button"
                          aria-expanded={expandedCase === kase.id}
                          aria-label={`${expandedCase === kase.id ? 'Collapse' : 'Expand'} details for ${kase.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedCase(expandedCase === kase.id ? null : kase.id)
                          }}
                          className="h-6 w-6 cursor-pointer rounded border border-hairline text-ink3 hover:bg-accent-wash hover:text-ink"
                        >
                          {expandedCase === kase.id ? '−' : '+'}
                        </button>
                      </td>
                    </tr>
                    {expandedCase === kase.id && (
                      <tr className="border-b border-hairline last:border-b-0">
                        <td colSpan={4} className="p-0">
                          <CaseDetail
                            kase={kase}
                            onCategory={(cat) => {
                              if (!categories.includes(cat)) setCategories([...categories, cat])
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
          <p className="text-xs text-ink3">
            {formatNumber(visible.length)} justice{visible.length === 1 ? '' : 's'}, in order of appointment ·
            click a row for the full record
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
                {th('Appointed', 'appointed')}
                {th('Cases', 'cases')}
                {th('In majority', 'majorityPct')}
                {th('Dissents', 'dissents')}
                {th('Opinions', 'opinions')}
                {th('Maj. opinions', 'majOpinions')}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.justiceName}
                  onClick={() => selectJustice(s.justiceName === selected ? null : s.justiceName)}
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
                        selectJustice(s.justiceName === selected ? null : s.justiceName)
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
