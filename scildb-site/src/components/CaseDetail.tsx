import type { Case } from '../types'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink3">{label}</dt>
      <dd className="m-0 text-sm text-ink2">{children}</dd>
    </div>
  )
}

/**
 * Expanded details for one case, shared by the Cases table and the
 * per-justice vote list. onCategory receives a clicked category chip so the
 * host page can apply it to its own filters.
 */
export default function CaseDetail({ kase, onCategory }: { kase: Case; onCategory: (category: string) => void }) {
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
              aria-label={`Filter to the category ${cat}`}
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
