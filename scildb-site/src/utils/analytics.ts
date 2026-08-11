/**
 * GoatCounter tracking helpers.
 *
 * The tracking script is loaded in index.html with `no_onload`, so nothing is
 * recorded until this module asks for it. Every call degrades silently if the
 * script is blocked, offline, or absent during local development.
 */

interface GoatCounterVars {
  path?: string
  title?: string
  referrer?: string
  event?: boolean
}

interface GoatCounter {
  count?: (vars?: GoatCounterVars) => void
  no_onload?: boolean
  allow_local?: boolean
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

/** Human-readable labels so the dashboard is not just a list of slugs. */
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/cases': 'Cases',
  '/justices': 'Justices',
  '/about': 'About',
  '/methodology': 'Methodology',
  '/contributors': 'Contributors',
}

/**
 * Send one hit to GoatCounter.
 *
 * The script tag is async, so it may not have finished loading when React
 * first mounts. Rather than dropping that first pageview, retry briefly and
 * then give up quietly.
 */
function send(vars: GoatCounterVars, attempt = 0): void {
  if (typeof window === 'undefined') return

  const gc = window.goatcounter
  if (typeof gc?.count === 'function') {
    gc.count(vars)
    return
  }

  if (attempt < 20) {
    window.setTimeout(() => send(vars, attempt + 1), 100)
  }
}

/** Record a pageview for the current route. */
export function trackPage(route: string): void {
  send({ path: route, title: ROUTE_TITLES[route] ?? route })
}

/** Record a data download. Appears under Events, separate from pageviews. */
export