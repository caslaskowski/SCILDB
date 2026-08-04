import { useState } from 'react'
import type { PortraitEntry } from '../types'

/**
 * A justice's portrait as a small circle, falling back to their initials
 * when no image is available (before fetch_portraits.py has been run, for
 * an unmatched justice, or if an image fails to load).
 *
 * The image is decorative: the justice's name always appears in text right
 * beside it, so it is hidden from assistive technology to avoid repetition.
 */
export default function JusticePortrait({
  fullName,
  portrait,
  size = 'sm',
}: {
  fullName: string
  portrait?: PortraitEntry
  size?: 'sm' | 'lg'
}) {
  const [failed, setFailed] = useState(false)
  const dims = size === 'lg' ? 'h-14 w-14' : 'h-8 w-8'

  const src = portrait?.url ?? (portrait?.file ? `${import.meta.env.BASE_URL}assets/justices/${portrait.file}` : null)

  if (!src || failed) {
    const parts = fullName.split(/\s+/).filter(Boolean)
    const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
    return (
      <span
        aria-hidden="true"
        className={`${dims} flex shrink-0 items-center justify-center rounded-full border border-hairline bg-accent-wash font-serif ${
          size === 'lg' ? 'text-lg' : 'text-[11px]'
        } font-semibold text-ink3 select-none`}
      >
        {initials}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dims} shrink-0 rounded-full border border-hairline object-cover object-top`}
    />
  )
}
