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

export interface OriginPoint {
  code: string
  count: number
}

export default function OriginMap({
  points,
  maxRadius = 32,
}: {
  points: OriginPoint[]
  maxRadius?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [centroids, setCentroids] = useState<Record<string, [number, number]> | null>(centroidCache)

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

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${US_MAP_WIDTH} ${US_MAP_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Proportional symbol map of case origins by state. ${sorted
        .slice(0, 5)
        .map((p) => `${STATE_NAMES[p.code]}: ${p.count}`)
        .join(', ')}${sorted.length > 5 ? ', and more — full list beside the map.' : '.'}`}
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
            return (
              <circle
                key={p.code}
                cx={c[0]}
                cy={c[1]}
                r={scale(p.count)}
                fill="var(--viz-1)"
                fillOpacity={0.72}
                stroke="var(--surface)"
                strokeWidth={2}
              >
                <title>{`${STATE_NAMES[p.code]}: ${formatNumber(p.count)} case${p.count === 1 ? '' : 's'}`}</title>
              </circle>
            )
          })}
        </g>
      )}
    </svg>
  )
}
