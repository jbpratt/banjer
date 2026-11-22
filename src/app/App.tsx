import { Suspense, lazy, useEffect, useMemo, useSyncExternalStore } from 'react'
import { getEngine, installUnlock } from './audio.ts'
import { useContent } from './content.ts'
import { formatRoute, parseRoute } from './routes.ts'
import type { Route } from './routes.ts'
import { useSettings, useTheme } from './settingsStore.ts'
import styles from './App.module.css'
import { Explore } from './views/explore/Explore.tsx'
import { Settings } from './views/Settings.tsx'

const Gallery = lazy(() => import('../ui/instrument/Gallery.tsx').then((m) => ({ default: m.Gallery })))

function subscribeHash(fn: () => void): () => void {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

const getHash = () => window.location.hash

function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, getHash, () => '')
  return useMemo(() => parseRoute(hash), [hash])
}

const NAV: { view: 'explore' | 'settings'; label: string }[] = [
  { view: 'explore', label: 'Explore' },
  { view: 'settings', label: 'Settings' },
]

export function App() {
  const route = useRoute()
  const settings = useSettings()
  const content = useContent()
  useTheme(settings.theme)

  useEffect(() => installUnlock(), [])
  useEffect(() => {
    getEngine().setVolume(settings.volume)
  }, [settings.volume])
  // Explore titles itself per chord or key; the other views are fixed.
  useEffect(() => {
    if (route.view === 'settings') document.title = 'Settings · Banjer'
    else if (route.view === 'gallery') document.title = 'Gallery · Banjer'
  }, [route.view])

  if (route.view === 'gallery') {
    return (
      <Suspense fallback={<p className={styles.loading}>Loading gallery…</p>}>
        <Gallery />
      </Suspense>
    )
  }

  return (
    <div className={styles.shell}>
      {/* Routes live in the hash, so move focus instead of navigating to #content. */}
      <a
        className={styles.skip}
        href="#content"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('content')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className={styles.header}>
        <a className={styles.brand} href={formatRoute({ view: 'explore' })}>
          Banjer
        </a>
        <nav aria-label="Main">
          <ul className={styles.nav} role="list">
            {NAV.map((n) => (
              <li key={n.view}>
                <a className={styles.navLink} href={formatRoute({ view: n.view })} aria-current={route.view === n.view ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className={styles.main} id="content" tabIndex={-1}>
        {route.view === 'explore' && (
          <Explore content={content} settings={settings} route={route} onRoute={(r) => window.location.replace(formatRoute(r))} />
        )}
        {route.view === 'settings' && <Settings settings={settings} />}
      </main>
    </div>
  )
}
