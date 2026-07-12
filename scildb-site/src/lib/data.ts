import { useEffect, useState } from 'react'
import type { Case, Dataset, Justice, Meta, VoteRec } from '../types'

let datasetPromise: Promise<Dataset> | null = null

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`)
  return res.json()
}

export function loadDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = Promise.all([
      fetchJson<Case[]>('cases.json'),
      fetchJson<VoteRec[]>('votes.json'),
      fetchJson<Justice[]>('justices.json'),
      fetchJson<Meta>('meta.json'),
    ]).then(([cases, votes, justices, meta]) => ({ cases, votes, justices, meta }))
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

export function decadeOf(term: number): number {
  return Math.floor(term / 10) * 10
}

export const DISPOSITIONS = ['Favorable', 'Unfavorable', 'Unclear', 'No Native party coded'] as const

/**
 * Whether this vote sided with the Native party's position, judged by the
 * case's coded disposition: joining a favorable majority or dissenting from an
 * unfavorable one counts as support, and the reverse as opposition.
 */
export function voteAlignment(vote: VoteRec, kase: Case): 'support' | 'oppose' | null {
  if (vote.m !== 1 && vote.m !== 2) return null
  if (kase.disposition === 'Favorable') return vote.m === 2 ? 'support' : 'oppose'
  if (kase.disposition === 'Unfavorable') return vote.m === 2 ? 'oppose' : 'support'
  return null
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
