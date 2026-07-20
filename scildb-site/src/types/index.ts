export interface Brief {
  title: string
  url: string
}

export interface Case {
  id: string
  name: string
  usCite: string | null
  term: number | null
  dateDecision: string | null
  /** YYYYMMDD int for chronological sorting by full decision date. */
  sortDate: number
  /**
   * Chronological case number: the first case decided is #1, and so on.
   * Assigned client-side in loadDataset() from the decision date.
   */
  index: number
  dateArgument: string | null
  categories: string[]
  tribes: string[]
  petitioner: string | null
  respondent: string | null
  partyWinning: string | null
  issue: string | null
  decisionType: string | null
  caseOrigin: string | null
  caseOriginState: string | null
  caseSource: string | null
  certReason: string | null
  chief: string | null
  majOpinWriter: string | null
  majVotes: number | null
  minVotes: number | null
  precedentAlteration: boolean
  url: string | null
  briefs: Brief[]
  citedCount: number
}

/** Compact per-(case, justice) vote record. */
export interface VoteRec {
  c: string // caseId
  j: string // SCDB justiceName
  v: number | null // vote code, see meta.voteLabels
  o: number | null // opinion: 1 none, 2 wrote, 3 co-authored
  m: number | null // majority: 1 dissent, 2 majority
  w: 0 | 1 // wrote the majority opinion
}

export interface Justice {
  justiceName: string
  fullName: string
  yearsCourt: string
  startYear: number | null
  endYear: number | null
  caseCount: number
}

export interface Meta {
  cases: number
  votes: number
  justices: number
  justicesWithVotes: number
  termMin: number
  termMax: number
  voteLabels: Record<string, string>
}

export interface Dataset {
  cases: Case[]
  votes: VoteRec[]
  justices: Justice[]
  meta: Meta
  /** Earliest year a decision in the database was issued (date decided, not term). */
  yearMin: number
  /** Latest year a decision in the database was issued (date decided, not term). */
  yearMax: number
}
