import { useMemo, useState } from 'react'
import type { NoteName, Position, ScaleId, Setup, TuningId } from '../../../domain/types.ts'
import { FRET_COUNT, SCALES, TUNINGS, noteName, parseChord, soundingMidi } from '../../../theory/index.ts'
import { Fretboard } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import { chordToneMarkers, prettyAccidentals, resolveLabels, scaleMarkers, setupKey } from '../../markers.ts'
import type { Settings } from '../../settings.ts'
import styles from '../Views.module.css'

const ROOTS: NoteName[] = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** Any scale or chord's tones across a fret range, with capo. */
export function ScaleView({ settings }: { settings: Settings }) {
  const [tuning, setTuning] = useState<TuningId>('open-g')
  const [capo, setCapo] = useState(0)
  const [what, setWhat] = useState<'scale' | 'chord'>('scale')
  const [root, setRoot] = useState<NoteName>('G')
  const [scale, setScale] = useState<ScaleId>('major-pentatonic')
  const [chord, setChord] = useState('G')
  const [lo, setLo] = useState(0)
  const [hi, setHi] = useState(12)
  const [heard, setHeard] = useState('')

  const setup: Setup = { tuning, capo }
  const frets: [number, number] = [Math.min(lo, hi), Math.max(lo, hi)]
  const kind = resolveLabels(settings.labels, 'explore')
  const markers = useMemo(
    () => (what === 'scale' ? scaleMarkers(setup, root, scale, frets, kind) : chordToneMarkers(setup, chord, frets, kind)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tuning, capo, what, root, scale, chord, frets[0], frets[1], kind],
  )
  const engine = getEngine()

  const subject =
    what === 'scale' ? `${prettyAccidentals(root)} ${SCALES[scale].name.toLowerCase()} scale` : `${prettyAccidentals(chord)} chord tones`

  function audition(pos: Position) {
    const midi = soundingMidi(setup, pos)
    engine.audition([midi])
    setHeard(`String ${pos.string}, fret ${pos.fret}, ${noteName(midi, setupKey(setup))}`)
  }

  return (
    <>
      <form className={styles.controls} onSubmit={(e) => e.preventDefault()}>
        <label className={styles.field}>
          Tuning
          <select value={tuning} onChange={(e) => setTuning(e.target.value as TuningId)}>
            {Object.values(TUNINGS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.short})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Capo
          <input type="number" min={0} max={9} value={capo} onChange={(e) => setCapo(clampInt(e.target.value, 0, 9))} />
        </label>
        <label className={styles.field}>
          Show
          <select value={what} onChange={(e) => setWhat(e.target.value as 'scale' | 'chord')}>
            <option value="scale">Scale</option>
            <option value="chord">Chord</option>
          </select>
        </label>
        {what === 'scale' ? (
          <>
            <label className={styles.field}>
              Root
              <select value={root} onChange={(e) => setRoot(e.target.value as NoteName)}>
                {ROOTS.map((r) => (
                  <option key={r} value={r}>
                    {prettyAccidentals(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Scale
              <select value={scale} onChange={(e) => setScale(e.target.value as ScaleId)}>
                {Object.values(SCALES).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className={styles.field}>
            Chord symbol
            <input
              value={chord}
              onChange={(e) => setChord(e.target.value)}
              aria-invalid={!parseChord(chord)}
              placeholder="G, Em, D7, Bbmaj7"
              size={8}
            />
          </label>
        )}
        <label className={styles.field}>
          From fret
          <input type="number" min={0} max={FRET_COUNT} value={lo} onChange={(e) => setLo(clampInt(e.target.value, 0, FRET_COUNT))} />
        </label>
        <label className={styles.field}>
          To fret
          <input type="number" min={0} max={FRET_COUNT} value={hi} onChange={(e) => setHi(clampInt(e.target.value, 0, FRET_COUNT))} />
        </label>
      </form>

      {markers ? (
        <div className={styles.board}>
          <Fretboard
            setup={setup}
            markers={markers}
            frets={frets}
            leftHanded={settings.leftHanded}
            onSelect={audition}
            label={`${subject}, frets ${frets[0]} to ${frets[1]}; roots marked`}
          />
        </div>
      ) : (
        <p className={styles.missing}>Unknown chord symbol “{chord}”. Try G, Em, D7, Cmaj7, Asus4.</p>
      )}
      <p className={styles.meta} role="status" aria-live="polite">
        {heard || 'Click a note to hear it.'}
      </p>
    </>
  )
}

function clampInt(v: string, lo: number, hi: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo
}
