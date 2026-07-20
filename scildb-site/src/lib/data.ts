import { useEffect, useState } from 'react'
import type { Case, Dataset, Justice, Meta, VoteRec } from '../types'

let datasetPromise: Promise<Dataset> | null = null

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`)
  return res.json()
}

/** "10 U.S. 87" → 10_00087, so same-day cases keep their U.S. Reports order. */
function citeSort(usCite: string | null): number {
  const m = usCite?.match(/^(\d+)\s+U\.?\s?S\.?,?\s+(\d+)/)
  if (!m) return Number.MAX_SAFE_INTEGER
  return Number(m[1]) * 100000 + Number(m[2])
}

/** Chronological order by decision date, tie-broken by citation then name. */
export function chronoCompare(a: Case, b: Case): number {
  if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate
  const ca = citeSort(a.usCite)
  const cb = citeSort(b.usCite)
  if (ca !== cb) return ca - cb
  return a.name.localeCompare(b.name)
}

export function loadDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = Promise.all([
      fetchJson<Case[]>('cases.json'),
      fetchJson<VoteRec[]>('votes.json'),
      fetchJson<Justice[]>('justices.json'),
      fetchJson<Meta>('meta.json'),
    ]).then(([cases, votes, justices, meta]) => {
      // Assign the chronological case number: first case decided is #1.
      const chrono = [...cases].sort(chronoCompare)
      chrono.forEach((c, i) => {
        c.index = i + 1
      })
      const years = cases.map(decisionYear)
      return {
        cases,
        votes,
        justices,
        meta,
        yearMin: Math.min(...years),
        yearMax: Math.max(...years),
      }
    })
  }
  return datasetPromise
}

export function useDataset(): { data: Dataset | null; error: string | null } {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadDataset()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e)))
    return () => {
      alive = false
    }
  }, [])
  return { data, error }
}

/* ── Shared derivations ─────────────────────────────────────────────────── */

/** Year the decision was issued (from the date decided, not the Court term). */
export function decisionYear(kase: Case): number {
  return Math.floor(kase.sortDate / 10000)
}

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10
}

/** Whether this vote record includes an opinion the justice wrote or co-authored. */
export function authoredOpinion(vote: VoteRec): boolean {
  return vote.o === 2 || vote.o === 3 || vote.w === 1
}

/** Appointment date as a sortable YYYYMMDD int, parsed from yearsCourt ("10/19/1789-…"). */
export function appointmentSort(justice: Justice): number {
  const m = justice.yearsCourt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return Number.MAX_SAFE_INTEGER
  return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2])
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

const VOTE_SHORT: Record<number, string> = {
  1: 'Majority',
  2: 'Dissent',
  3: 'Concurrence',
  4: 'Special concurrence',
  5: 'Judgment of the Court',
  6: 'Dissent from cert denial',
  7: 'Jurisdictional dissent',
  8: 'Equally divided vote',
}

export function voteShortLabel(v: number | null): string {
  return v != null ? (VOTE_SHORT[v] ?? '—') : '—'
}
