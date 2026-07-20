import { useEffect, useState } from 'react'

export type Route = '/' | '/cases' | '/justices' | '/about' | '/methodology' | '/contributors'

const ROUTES: Route[] = ['/', '/cases', '/justices', '/about', '/methodology', '/contributors']

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0]
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : '/'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function href(route: Route): string {
  return `#${route}`
}

/**
 * Query parameters carried in the hash, e.g. "#/cases?from=1830&to=1839".
 * Pages read these once on mount to seed their filters.
 */
export function getHashQuery(): URLSearchParams {
  const i = window.location.hash.indexOf('?')
  return new URLSearchParams(i >= 0 ? window.location.hash.slice(i + 1) : '')
}
