import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../lib/data'

/* ── Card & legend chrome ───────────────────────────────────────────────── */

export function ChartCard({
  title,
  subtitle,
  children,
  legend,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  legend?: { label: string; color: string }[]
}) {
  return (
    <section className="rounded-lg border border-hairline bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-ink3">{subtitle}</p>}
        </div>
        {legend && legend.length > 1 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </section>
  )
}

/* ── Tooltip (shared visual language) ───────────────────────────────────── */

interface TooltipEntry {
  name?: string | number
  value?: string | number | Array<string | number>
  color?: string
}

export function VizTooltip({
  active,
  label,
  payload,
  labelFormatter,
}: {
  active?: boolean
  label?: string | number
  payload?: TooltipEntry[]
  labelFormatter?: (label: string | number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload.filter((p) => p.value !== 0 || payload.length === 1)
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-ink">
        {labelFormatter && label != null ? labelFormatter(label) : label}
      </p>
      {rows.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-ink2">
          {p.color && (
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
          )}
          {p.name != null && String(p.name) !== String(label) ? `${p.name}: ` : ''}
          <span className="font-medium text-ink">{formatNumber(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  )
}

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 }

/* ── Column chart over decades (single series or stacked) ───────────────── */

export interface DecadeSeries {
  key: string
  label: string
  color: string
}

export function DecadeColumns({
  data,
  series,
  height = 240,
  onClickDecade,
}: {
  data: Record<string, number | string>[]
  series: DecadeSeries[]
  height?: number
  /** When set, clicking a column reports its decade (e.g. 1830). */
  onClickDecade?: (decade: number) => void
}) {
  return (
    <div
      style={{ height, cursor: onClickDecade ? 'pointer' : undefined }}
      role="img"
      aria-label={`Column chart of case counts by decade decided${onClickDecade ? '; click a column to browse that decade' : ''}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          barCategoryGap="25%"
          onClick={(state) => {
            const label = state?.activeLabel
            if (onClickDecade && label != null && label !== '') onClickDecade(Number(label))
          }}
        >
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey="decade"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)', strokeWidth: 1 }}
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(d) => `${d}s`}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--accent-wash)' }}
            content={<VizTooltip labelFormatter={(d) => `${d}s`} />}
            isAnimationActive={false}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="stack"
              fill={s.color}
              maxBarSize={24}
              // top of the stack gets the rounded data-end; baseline stays square
              radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              // 2px surface gap between stacked segments
              stroke="var(--surface)"
              strokeWidth={series.length > 1 ? 1 : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Horizontal bar list (nominal categories, one hue) ──────────────────── */

export function HBarList({
  items,
  maxValue,
  color = 'var(--viz-1)',
  onClickItem,
}: {
  items: { label: string; value: number }[]
  maxValue?: number
  color?: string
  onClickItem?: (label: string) => void
}) {
  const max = maxValue ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const inner = (
          <>
            <span className="w-44 shrink-0 truncate text-right text-xs text-ink2" title={item.label}>
              {item.label}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-r-[4px] bg-viztrack">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{ width: `${(item.value / max) * 100}%`, background: color }}
              />
            </span>
            <span className="w-10 shrink-0 text-left text-xs font-medium text-ink tabular-nums">
              {formatNumber(item.value)}
            </span>
          </>
        )
        return (
          <li key={item.label}>
            {onClickItem ? (
              <button
                type="button"
                onClick={() => onClickItem(item.label)}
                title={`Filter to “${item.label}”`}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent-wash"
              >
                {inner}
              </button>
            ) : (
              <span className="flex items-center gap-2 px-1 py-0.5">{inner}</span>
            )}
          </li>
        )
      })}
      {items.length === 0 && <li className="py-4 text-center text-xs text-ink3">No data for this filter.</li>}
    </ul>
  )
}

/* ── Stat tile ──────────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  detail,
  onClick,
  title,
  active,
}: {
  label: string
  value: string
  detail?: string
  /** When set, the tile renders as a button (e.g. "Opinions authored" applying a filter). */
  onClick?: () => void
  title?: string
  /** For clickable tiles that toggle a filter: whether that filter is currently applied. */
  active?: boolean
}) {
  const inner = (
    <>
      <p className="text-xs text-ink3">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-ink3">{detail}</p>}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-pressed={active}
        className={`cursor-pointer rounded-lg border px-4 py-3 text-left hover:border-accent hover:bg-accent-wash ${
          active ? 'border-accent bg-accent-wash' : 'border-hairline bg-surface'
        }`}
      >
        {inner}
      </button>
    )
  }
  return <div className="rounded-lg border border-hairline bg-surface px-4 py-3">{inner}</div>
}
