import { useEffect, useState } from 'react'

export type Route = '/' | '/cases' | '/justices' | '/about'

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0]
  if (raw === '/cases' || raw === '/justices' || raw === '/about') return raw
  return '/'
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
