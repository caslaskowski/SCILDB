import { useEffect, useRef, useState, type ReactNode } from 'react'

/* ── Filter row wrapper: one row above everything it scopes ─────────────── */

export function FilterBar({ children, onClear, active }: { children: ReactNode; onClear: () => void; active: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-surface p-3">
      {children}
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto h-8 cursor-pointer rounded-md px-2 text-xs text-accent hover:bg-accent-wash"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[11px] font-medium text-ink3">{children}</span>
}

const controlClass =
  'h-8 rounded-md border border-hairline bg-page px-2 text-sm text-ink outline-none focus:border-accent'

/* ── Text search ────────────────────────────────────────────────────────── */

export function SearchBox({
  label,
  value,
  onChange,
  placeholder,
  width = 'w-64',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: string
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${controlClass} ${width}`}
      />
    </label>
  )
}

/* ── Single select ──────────────────────────────────────────────────────── */

export function SelectBox({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel?: string
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${controlClass} max-w-56 cursor-pointer`}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/* ── Multi-select dropdown with checkboxes ──────────────────────────────── */

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Any',
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option])
  }

  const summary =
    selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`

  return (
    <div className="relative block" ref={ref}>
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${controlClass} flex w-52 cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${selected.length === 0 ? 'text-ink3' : ''}`}>{summary}</span>
        <svg width="10" height="10" viewBox="0 0 10 6" aria-hidden="true" className="shrink-0 text-ink3">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-72 overflow-auto rounded-md border border-hairline bg-surface p-1 shadow-lg">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full cursor-pointer rounded px-2 py-1 text-left text-xs text-accent hover:bg-accent-wash"
            >
              Clear selection
            </button>
          )}
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-ink2 hover:bg-accent-wash"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="accent-accent"
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Year range (from / to) ─────────────────────────────────────────────── */

export function YearRange({
  label,
  min,
  max,
  from,
  to,
  onChange,
}: {
  label: string
  min: number
  max: number
  from: number
  to: number
  onChange: (from: number, to: number) => void
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={from}
          min={min}
          max={max}
          onChange={(e) => {
            const v = clamp(Number(e.target.value) || min)
            onChange(v, Math.max(v, to))
          }}
          className={`${controlClass} w-21`}
          aria-label={`${label} from`}
        />
        <span className="text-xs text-ink3">–</span>
        <input
          type="number"
          value={to}
          min={min}
          max={max}
          onChange={(e) => {
            const v = clamp(Number(e.target.value) || max)
            onChange(Math.min(from, v), v)
          }}
          className={`${controlClass} w-21`}
          aria-label={`${label} to`}
        />
      </div>
    </div>
  )
}
