import { useMemo } from 'react'
import { ChartCard, DecadeColumns, StatTile } from '../components/charts'
import { decadeOf, formatNumber, useDataset } from '../lib/data'
import { href } from '../lib/router'

export default function Home() {
  const { data, error } = useDataset()

  const byDecade = useMemo(() => {
    if (!data) return []
    const counts = new Map<number, number>()
    for (const c of data.cases) {
      if (c.term == null) continue
      const d = decadeOf(c.term)
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    const decades = [...counts.keys()]
    const min = Math.min(...decades)
    const max = Math.max(...decades)
    const rows: { decade: number; count: number }[] = []
    for (let d = min; d <= max; d += 10) rows.push({ decade: d, count: counts.get(d) ?? 0 })
    return rows
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
          {data ? `${data.meta.termMin}–${data.meta.termMax}` : '…'}, categorized by topic and linked to
          opinions, briefs, and justice-level voting records.
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
          label="Terms covered"
          value={data ? `${data.meta.termMax - data.meta.termMin + 1}` : '—'}
          detail={data ? `${data.meta.termMin} – ${data.meta.termMax}` : undefined}
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
          title="Indian law cases before the Supreme Court, by decade"
          subtitle="Number of SCILDB cases decided in each decade — hover a column for the count"
        >
          <DecadeColumns data={byDecade} series={[{ key: 'count', label: 'Cases', color: 'var(--viz-1)' }]} />
        </ChartCard>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <a
          href={href('/cases')}
          className="group rounded-lg border border-hairline bg-surface p-5 no-underline hover:border-accent"
        >
          <h2 className="font-serif text-lg font-semibold text-ink group-hover:text-accent-strong">Cases →</h2>
          <p className="mt-1.5 text-sm text-ink2">
            Filter the full case list by topic, era, tribe, and outcome. Visualize how the Court has ruled and
            follow links to opinions and archival briefs.
          </p>
        </a>
        <a
          href={href('/justices')}
          className="group rounded-lg border border-hairline bg-surface p-5 no-underline hover:border-accent"
        >
          <h2 className="font-serif text-lg font-semibold text-ink group-hover:text-accent-strong">Justices →</h2>
          <p className="mt-1.5 text-sm text-ink2">
            Compare how individual justices voted in Indian law cases: participation, opinions authored, and
            alignment with Native parties.
          </p>
        </a>
        <a
          href={href('/about')}
          className="group rounded-lg border border-hairline bg-surface p-5 no-underline hover:border-accent"
        >
          <h2 className="font-serif text-lg font-semibold text-ink group-hover:text-accent-strong">About →</h2>
          <p className="mt-1.5 text-sm text-ink2">
            How the database was built: the definition of “Indian law,” the four-phase case identification
            process, data sources, and the team behind it.
          </p>
        </a>
      </section>
    </div>
  )
}
