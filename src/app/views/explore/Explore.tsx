import { useState } from 'react'
import type { NoteName, TuningId } from '../../../domain/types.ts'
import { TUNINGS, isNoteName, parseChord } from '../../../theory/index.ts'
import type { Content } from '../../content.ts'
import { formatRoute } from '../../routes.ts'
import type { ExploreMode, Route } from '../../routes.ts'
import type { Settings } from '../../settings.ts'
import viewStyles from '../Views.module.css'
import { ChordLab } from './ChordLab.tsx'
import styles from './Explore.module.css'
import { KeyView } from './KeyView.tsx'
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

export function Explore({ content, settings, route, onRoute }: Props) {
  const mode = route.mode ?? 'chords'
  const [tuning, setTuning] = useState<TuningId>('open-g')
  const [labels, setLabels] = useState<LabLabels>(settings.labels === 'note' ? 'note' : 'degree')

  // Chord and key live in the URL so Claude can link straight to "#/explore/chords/D7".
  const chord = mode === 'chords' ? parseChord(route.subject ?? '') : null
  const root: NoteName = chord?.root ?? 'G'
  const quality = chord?.quality ?? ''
  const key: NoteName = mode === 'keys' && route.subject && isNoteName(route.subject) ? route.subject : 'G'

  return (
    <section className={styles.page} aria-labelledby="explore-title">
      <header className={styles.head}>
        <h1 id="explore-title">Explore</h1>
        <nav aria-label="Explore views" className={styles.tabs}>
          {TABS.map((t) => (
            <a
              key={t.mode}
              className={styles.tab}
              href={formatRoute({ view: 'explore', mode: t.mode, ...(t.mode === 'keys' ? { subject: root } : t.mode === 'chords' ? { subject: root + quality } : {}) })}
              aria-current={mode === t.mode ? 'page' : undefined}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {mode !== 'scales' && (
        <div className={viewStyles.controls}>
          <label className={viewStyles.field}>
            Tuning
            <select value={tuning} onChange={(e) => setTuning(e.target.value as TuningId)}>
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
        </div>
      )}

      {mode === 'chords' && (
        <ChordLab
          content={content}
          tuning={tuning}
          root={root}
          quality={quality}
          labels={labels}
          leftHanded={settings.leftHanded}
          onChord={(r, q) => onRoute({ view: 'explore', mode: 'chords', subject: r + q })}
        />
      )}
      {mode === 'keys' && (
        <KeyView
          tuning={tuning}
          keyName={key}
          labels={labels}
          leftHanded={settings.leftHanded}
          onKey={(k) => onRoute({ view: 'explore', mode: 'keys', subject: k })}
        />
      )}
      {mode === 'scales' && <ScaleView settings={settings} />}
    </section>
  )
}
