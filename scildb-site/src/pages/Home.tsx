import { useMemo, useState } from 'react'
import { ChartCard, DecadeColumns, HBarList, StatTile } from '../components/charts'
import { authoredOpinion, decadeOf, decisionYear, formatNumber, useDataset } from '../lib/data'
import { href } from '../lib/router'

type JusticeMeasure = 'participated' | 'authored'

export default function Home() {
  const { data, error } = useDataset()
  const [measure, setMeasure] = useState<JusticeMeasure>('participated')

  const byDecade = useMemo(() => {
    if (!data) return []
    const counts = new Map<number, number>()
    for (const c of data.cases) {
      const d = decadeOf(decisionYear(c))
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    const decades = [...counts.keys()]
    const min = Math.min(...decades)
    const max = Math.max(...decades)
    const rows: { decade: number; count: number }[] = []
    for (let d = min; d <= max; d += 10) rows.push({ decade: d, count: counts.get(d) ?? 0 })
    return rows
  }, [data])

  const topJustices = useMemo(() => {
    if (!data) return { participated: [], authored: [], justiceByLabel: new Map<string, string>() }
    const participated = new Map<string, number>()
    const authored = new Map<string, number>()
    for (const v of data.votes) {
      participated.set(v.j, (participated.get(v.j) ?? 0) + 1)
      if (authoredOpinion(v)) authored.set(v.j, (authored.get(v.j) ?? 0) + 1)
    }
    // Disambiguate justices who share a full name (e.g. the two John Harlans).
    const nameCounts = new Map<string, number>()
    for (const j of data.justices) nameCounts.set(j.fullName, (nameCounts.get(j.fullName) ?? 0) + 1)
    const labelFor = new Map(
      data.justices.map((j) => [
        j.justiceName,
        (nameCounts.get(j.fullName) ?? 0) > 1 && j.startYear != null
          ? `${j.fullName} (${j.startYear}–${j.endYear ?? ''})`
          : j.fullName,
      ]),
    )
    const top = (counts: Map<string, number>) =>
      [...counts.entries()]
        .map(([jn, value]) => ({ label: labelFor.get(jn) ?? jn, value, justiceName: jn }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    const participatedTop = top(participated)
    const authoredTop = top(authored)
    return {
      participated: participatedTop,
      authored: authoredTop,
      justiceByLabel: new Map([...participatedTop, ...authoredTop].map((r) => [r.label, r.justiceName])),
    }
  }, [data])

  if (error) return <p className="py-16 text-center text-sm text-ink3">Could not load the database: {error}</p>

  return (
    <div>
      <section className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">
          Indigenous Peoples Law and Policy Program · University of Arizona
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Supreme Court Indian Law Database
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-ink2">
          A comprehensive, searchable record of every federal Indian law case decided by the United States
          Supreme Court — {data ? formatNumber(data.meta.cases) : '…'} cases spanning{' '}
          {data ? `${data.yearMin}–${data.yearMax}` : '…'}, categorized by topic and linked to opinions,
          briefs, and justice-level voting records.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href={href('/cases')}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-accent-strong dark:text-page"
          >
            Explore the cases
          </a>
          <a
            href={href('/justices')}
            className="rounded-md border border-hairline bg-surface px-5 py-2.5 text-sm font-medium text-ink no-underline hover:bg-accent-wash"
          >
            Explore the justices
          </a>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Cases" value={data ? formatNumber(data.meta.cases) : '—'} detail="identified & categorized" />
        <StatTile
          label="Years covered"
          value={data ? `${data.yearMax - data.yearMin + 1}` : '—'}
          detail={data ? `decided ${data.yearMin} – ${data.yearMax}` : undefined}
        />
        <StatTile
          label="Justices"
          value={data ? formatNumber(data.meta.justicesWithVotes) : '—'}
          detail="participated in these cases"
        />
        <StatTile label="Individual votes" value={data ? formatNumber(data.meta.votes) : '—'} detail="justice-level records" />
      </section>

      <section className="mt-6">
        <ChartCard
          title="Indian law cases before the Supreme Court, by decade decided"
          subtitle="Decades reflect the date each decision was issued, not the Court term — click a column to browse that decade's cases"
        >
          <DecadeColumns
            data={byDecade}
            series={[{ key: 'count', label: 'Cases', color: 'var(--viz-1)' }]}
            onClickDecade={(decade) => {
              window.location.hash = `/cases?from=${decade}&to=${decade + 9}`
            }}
          />
        </ChartCard>
      </section>

      <section className="mt-6">
        <ChartCard
          title={
            measure === 'participated'
              ? 'Top 10 justices by cases participated in'
              : 'Top 10 justices by opinions authored'
          }
          subtitle={
            measure === 'participated'
              ? `Justices who cast votes in the most of the ${data ? formatNumber(data.meta.cases) : ''} cases in the database — click a justice for their record`
              : 'Justices who wrote or co-authored the most opinions, concurrences, or dissents in these cases — click a justice for their record'
          }
        >
          <div className="mb-3 flex gap-1.5" role="group" aria-label="Choose a measure for the top justices chart">
            <button
              type="button"
              onClick={() => setMeasure('participated')}
              aria-pressed={measure === 'participated'}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                measure === 'participated'
                  ? 'border-accent bg-accent-wash text-accent-strong'
                  : 'border-hairline text-ink2 hover:bg-accent-wash'
              }`}
            >
              Cases participated in
            </button>
            <button
              type="button"
              onClick={() => setMeasure('authored')}
              aria-pressed={measure === 'authored'}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                measure === 'authored'
                  ? 'border-accent bg-accent-wash text-accent-strong'
                  : 'border-hairline text-ink2 hover:bg-accent-wash'
              }`}
            >
              Opinions authored
            </button>
          </div>
          <HBarList
            items={measure === 'participated' ? topJustices.participated : topJustices.authored}
            onClickItem={(label) => {
              const jn = topJustices.justiceByLabel.get(label)
              if (jn) window.location.hash = `/justices?j=${encodeURIComponent(jn)}`
            }}
          />
        </ChartCard>
      </section>
    </div>
  )
}
