import { useEffect, useState } from 'react'
import type { TuningId } from '../../../domain/types.ts'
import { TUNINGS, parseChord } from '../../../theory/index.ts'
import type { Content } from '../../content.ts'
import { formatRoute } from '../../routes.ts'
import type { ExploreMode, Route } from '../../routes.ts'
import type { Settings } from '../../settings.ts'
import { updateSettings } from '../../settingsStore.ts'
import viewStyles from '../Views.module.css'
import { ChordLab } from './ChordLab.tsx'
import styles from './Explore.module.css'
import { KeyView } from './KeyView.tsx'
import { exploreTitle, resolveChord, resolveKey } from './lab.ts'
import type { LabLabels } from './lab.ts'
import { ScaleView } from './ScaleView.tsx'

const TABS: { mode: ExploreMode; label: string }[] = [
  { mode: 'chords', label: 'Chord lab' },
  { mode: 'keys', label: 'Keys' },
  { mode: 'scales', label: 'Scales & tones' },
]

interface Props {
  content: Content
  settings: Settings
  route: Extract<Route, { view: 'explore' }>
  /** Replace the current route (no new history entry). */
  onRoute: (r: Route) => void
}

interface Notice {
  text: string
  mode: ExploreMode
  /** Shown while the route still points at the fallback it was replaced with. */
  subject: string
}

export function Explore({ content, settings, route, onRoute }: Props) {
  const mode = route.mode ?? 'chords'
  const tuning = settings.tuning
  const [labels, setLabels] = useState<LabLabels>(settings.labels === 'note' ? 'note' : 'degree')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [lastChord, setLastChord] = useState<string | null>(null)

  // Chord and key live in the URL so Claude can link straight to "#/explore/chords/D7".
  const chord = resolveChord(mode === 'chords' ? route.subject : undefined)
  const key = resolveKey(mode === 'keys' ? route.subject : undefined)
  const { root, quality } = chord.value
  const symbol = root + quality
  // Remembered so the Chord lab tab returns to it from Keys or Scales.
  if (mode === 'chords' && !chord.unknown && lastChord !== symbol) setLastChord(symbol)

  // Unknown or loosely written subjects ('G13', 'g7') are rewritten to what's shown.
  useEffect(() => {
    if (mode === 'scales') return
    const r = mode === 'chords' ? resolveChord(route.subject) : resolveKey(route.subject)
    if (!r.replace) return
    if (r.unknown) {
      const what = mode === 'chords' ? 'chord' : 'key'
      setNotice({ text: `Unknown ${what} “${r.unknown}” — showing ${mode === 'chords' ? 'G' : 'G major'}.`, mode, subject: r.replace })
    }
    onRoute({ view: 'explore', mode, subject: r.replace })
    // onRoute is a fresh closure each render; the route is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, route.subject])

  useEffect(() => {
    document.title = exploreTitle(mode, symbol, key.value)
  }, [mode, symbol, key.value])

  const showNotice = notice && notice.mode === mode && notice.subject === route.subject
  const lastRoot = lastChord ? parseChord(lastChord)?.root : undefined
  const tabSubject = (m: ExploreMode): string | undefined => {
    if (m === 'chords') return mode === 'chords' ? symbol : (lastChord ?? (mode === 'keys' ? key.value : undefined))
    if (m === 'keys') return mode === 'keys' ? key.value : mode === 'chords' ? root : lastRoot
    return undefined
  }

  const shared = (
    <>
      <label className={viewStyles.field}>
        Tuning
        <select value={tuning} onChange={(e) => updateSettings({ tuning: e.target.value as TuningId })}>
          {Object.values(TUNINGS).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.short})
            </option>
          ))}
        </select>
      </label>
      <fieldset className={styles.segmented}>
        <legend>Labels</legend>
        {(['degree', 'note'] as const).map((k) => (
          <label key={k} className={styles.segment}>
            <input type="radio" name="explore-labels" checked={labels === k} onChange={() => setLabels(k)} />
            <span>{k === 'degree' ? 'Degrees' : 'Notes'}</span>
          </label>
        ))}
      </fieldset>
    </>
  )

  return (
    <section className={styles.page} aria-labelledby="explore-title">
      <header className={styles.head}>
        <h1 id="explore-title">Explore</h1>
        <nav aria-label="Explore views" className={styles.tabs}>
          {TABS.map((t) => {
            const subject = tabSubject(t.mode)
            return (
              <a
                key={t.mode}
                className={styles.tab}
                href={formatRoute({ view: 'explore', mode: t.mode, ...(subject ? { subject } : {}) })}
                aria-current={mode === t.mode ? 'page' : undefined}
              >
                {t.label}
              </a>
            )
          })}
        </nav>
      </header>

      <div role="status">{showNotice && <p className={styles.notice}>{notice.text}</p>}</div>

      {mode === 'chords' && (
        <ChordLab
          content={content}
          tuning={tuning}
          root={root}
          quality={quality}
          labels={labels}
          leftHanded={settings.leftHanded}
          controls={shared}
          onChord={(r, q) => onRoute({ view: 'explore', mode: 'chords', subject: r + q })}
        />
      )}
      {mode === 'keys' && (
        <KeyView
          tuning={tuning}
          keyName={key.value}
          labels={labels}
          leftHanded={settings.leftHanded}
          controls={shared}
          onKey={(k) => onRoute({ view: 'explore', mode: 'keys', subject: k })}
        />
      )}
      {mode === 'scales' && <ScaleView tuning={tuning} labels={labels} leftHanded={settings.leftHanded} controls={shared} />}
    </section>
  )
}
