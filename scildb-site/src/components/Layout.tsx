import type { ReactNode } from 'react'
import { href, useRoute, type Route } from '../lib/router'
import { useTheme } from '../lib/theme'

const NAV: { route: Route; label: string }[] = [
  { route: '/', label: 'Home' },
  { route: '/cases', label: 'Cases' },
  { route: '/justices', label: 'Justices' },
  { route: '/about', label: 'About' },
  { route: '/methodology', label: 'Methodology' },
  { route: '/contributors', label: 'Contributors' },
]

function ThemeToggle() {
  const [theme, toggle] = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-ink2 hover:bg-accent-wash"
    >
      {theme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const route = useRoute()
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-hairline bg-page/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href={href('/')} className="flex shrink-0 items-baseline gap-2 no-underline">
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">SCILDB</span>
            <span className="hidden text-xs text-ink3 lg:inline">Supreme Court Indian Law Database</span>
          </a>
          <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Site">
            {NAV.map((item) => (
              <a
                key={item.route}
                href={href(item.route)}
                aria-current={route === item.route ? 'page' : undefined}
                className={`rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap no-underline ${
                  route === item.route
                    ? 'bg-accent-wash font-medium text-accent-strong'
                    : 'text-ink2 hover:bg-accent-wash hover:text-ink'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ink3 sm:px-6">
          <p>
            Supreme Court Indian Law Database · Indigenous Peoples Law and Policy Program, University of
            Arizona
          </p>
          <p>
            <a href="mailto:richotte@arizona.edu" className="text-accent hover:underline">
              richotte@arizona.edu
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
