import { useLayoutEffect, useRef, useState } from 'react'
import { formatNumber } from '../lib/data'
import { STATE_NAMES, STATE_PATHS, US_MAP_HEIGHT, US_MAP_WIDTH } from '../lib/usStates'

/** Nudges for states whose bounding-box center falls off the landmass. */
const CENTROID_OFFSETS: Record<string, [number, number]> = {
  MI: [14, 28], // bbox center falls between the peninsulas
  FL: [16, -6], // panhandle skews the box west
  LA: [-10, -4],
  ID: [4, 24], // panhandle skews the box north
  VA: [12, -4],
}

let centroidCache: Record<string, [number, number]> | null = null

const MAX_COURTS_IN_POPUP = 6

export interface OriginPoint {
  code: string
  count: number
  /** Per-court breakdown for the popup, sorted by count descending. */
  courts?: { label: string; count: number }[]
}

export default function OriginMap({
  points,
  maxRadius = 32,
  selectedCode = null,
  onSelectState,
}: {
  points: OriginPoint[]
  maxRadius?: number
  /** Highlighted state, when the case list is filtered to one. */
  selectedCode?: string | null
  /** Click/keyboard handler: filter the cases to this state (toggle handled by the caller). */
  onSelectState?: (code: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [centroids, setCentroids] = useState<Record<string, [number, number]> | null>(centroidCache)
  const [hovered, setHovered] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (centroidCache) return
    const svg = svgRef.current
    if (!svg) return
    const result: Record<string, [number, number]> = {}
    svg.querySelectorAll<SVGPathElement>('path[data-state]').forEach((path) => {
      const code = path.dataset.state!
      const box = path.getBBox()
      const [dx, dy] = CENTROID_OFFSETS[code] ?? [0, 0]
      result[code] = [box.x + box.width / 2 + dx, box.y + box.height / 2 + dy]
    })
    centroidCache = result
    setCentroids(result)
  }, [])

  const max = Math.max(1, ...points.map((p) => p.count))
  const scale = (count: number) => Math.max(3.5, maxRadius * Math.sqrt(count / max))
  const sorted = [...points].sort((a, b) => b.count - a.count) // big circles behind small ones

  const active = hovered ? sorted.find((p) => p.code === hovered) : null
  const activeCentroid = active && centroids ? centroids[active.code] : null

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${US_MAP_WIDTH} ${US_MAP_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Proportional symbol map of case origins by state. ${sorted
          .slice(0, 5)
          .map((p) => `${STATE_NAMES[p.code]}: ${p.count}`)
          .join(', ')}${sorted.length > 5 ? ', and more — full list beside the map.' : '.'}${
          onSelectState ? ' Select a state to filter the case list to it.' : ''
        }`}
      >
        <g>
          {Object.entries(STATE_PATHS).map(([code, d]) => (
            <path
              key={code}
              data-state={code}
              d={d}
              fill="var(--viz-track)"
              stroke="var(--surface)"
              strokeWidth={1}
            />
          ))}
        </g>
        {centroids && (
          <g>
            {sorted.map((p) => {
              const c = centroids[p.code]
              if (!c) return null
              const selected = selectedCode === p.code
              return (
                <circle
                  key={p.code}
                  cx={c[0]}
                  cy={c[1]}
                  r={scale(p.count)}
                  fill="var(--viz-1)"
                  fillOpacity={hovered === p.code || selected ? 0.92 : 0.72}
                  stroke={selected ? 'var(--accent-strong)' : 'var(--surface)'}
                  strokeWidth={selected ? 2.5 : 2}
                  tabIndex={0}
                  role={onSelectState ? 'button' : undefined}
                  aria-pressed={onSelectState ? selected : undefined}
                  aria-label={`${STATE_NAMES[p.code]}: ${formatNumber(p.count)} case${p.count === 1 ? '' : 's'}${
                    onSelectState ? (selected ? '. Selected — activate to clear the filter.' : '. Activate to filter cases to this state.') : ''
                  }`}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHovered(p.code)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(p.code)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelectState?.(p.code)}
                  onKeyDown={(e) => {
                    if (onSelectState && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelectState(p.code)
                    }
                  }}
                />
              )
            })}
          </g>
        )}
      </svg>
      {active && activeCentroid && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-md border border-hairline bg-surface px-3 py-2 text-xs shadow-sm"
          style={{
            left: `${Math.min(85, Math.max(15, (activeCentroid[0] / US_MAP_WIDTH) * 100))}%`,
            ...(activeCentroid[1] / US_MAP_HEIGHT < 0.25
              ? {
                  top: `${(activeCentroid[1] / US_MAP_HEIGHT) * 100}%`,
                  transform: `translate(-50%, ${Math.round(scale(active.count))}px)`,
                }
              : {
                  top: `${(activeCentroid[1] / US_MAP_HEIGHT) * 100}%`,
                  transform: `translate(-50%, calc(-100% - ${Math.round(scale(active.count))}px))`,
                }),
          }}
        >
          <p className="mb-1 font-medium text-ink">
            {STATE_NAMES[active.code]}
            <span className="text-ink2">
              {' — '}
              {formatNumber(active.count)} case{active.count === 1 ? '' : 's'}
            </span>
          </p>
          {active.courts?.slice(0, MAX_COURTS_IN_POPUP).map((court) => (
            <p key={court.label} className="flex items-baseline justify-between gap-3 text-ink2">
              <span>{court.label}</span>
              <span className="font-medium text-ink">{formatNumber(court.count)}</span>
            </p>
          ))}
          {active.courts && active.courts.length > MAX_COURTS_IN_POPUP && (
            <p className="mt-0.5 text-ink3">
              + {active.courts.length - MAX_COURTS_IN_POPUP} more court
              {active.courts.length - MAX_COURTS_IN_POPUP === 1 ? '' : 's'}
            </p>
          )}
          {onSelectState && (
            <p className="mt-1 text-ink3">{selectedCode === active.code ? 'Click to clear this filter' : 'Click to filter cases to this state'}</p>
          )}
        </div>
      )}
    </div>
  )
}
