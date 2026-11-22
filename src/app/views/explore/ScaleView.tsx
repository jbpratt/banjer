import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Position, ScaleId, Setup, TuningId } from '../../../domain/types.ts'
import { FRET_COUNT, SCALES, parseChord, pitchClass, prettyNote, soundingMidi, spellInChord, spellInScale, spelledName } from '../../../theory/index.ts'
import type { SpelledNote } from '../../../theory/index.ts'
import { Fretboard } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import { chordToneMarkers, scaleMarkers } from '../../markers.ts'
import styles from '../Views.module.css'
import type { LabLabels } from './lab.ts'

const ROOTS: SpelledNote[] = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

interface Props {
  tuning: TuningId
  labels: LabLabels
  leftHanded: boolean
  /** Explore's shared toolbar controls (tuning, labels). */
  controls: ReactNode
}

/** Any scale or chord's tones across a fret range, with capo. */
export function ScaleView({ tuning, labels, leftHanded, controls }: Props) {
  const [capo, setCapo] = useState(0)
  const [what, setWhat] = useState<'scale' | 'chord'>('scale')
  const [root, setRoot] = useState<SpelledNote>('G')
  const [scale, setScale] = useState<ScaleId>('major-pentatonic')
  const [chordInput, setChord] = useState('G')
  const [lo, setLo] = useState(0)
  const [hi, setHi] = useState(12)
  const [heard, setHeard] = useState('')
  const statusId = useId()

  // A lower-case root reads as the chord ('g7' is G7), as in chord routes.
  const chord = chordInput.trim().charAt(0).toUpperCase() + chordInput.trim().slice(1)
  const parsed = parseChord(chord)
  const invalid = what === 'chord' && !parsed
  const setup: Setup = useMemo(() => ({ tuning, capo }), [tuning, capo])
  const frets: [number, number] = [Math.min(lo, hi), Math.max(lo, hi)]
  const kind = labels === 'note' ? 'note' : 'interval'
  const markers = useMemo(
    () => (what === 'scale' ? scaleMarkers(setup, root, scale, frets, kind) : chordToneMarkers(setup, chord, frets, kind)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setup, what, root, scale, chord, frets[0], frets[1], kind],
  )
  const engine = getEngine()

  useEffect(() => {
    if (markers) engine.prewarm(markers.map((m) => soundingMidi(setup, m.pos)))
  }, [markers, setup, engine])

  const subject =
    what === 'scale' ? `${prettyNote(root)} ${SCALES[scale].name.toLowerCase()} scale` : `${prettyNote(chord)} chord tones`

  function audition(pos: Position) {
    const midi = soundingMidi(setup, pos)
    engine.audition([midi])
    const pc = pitchClass(midi)
    const note = what === 'scale' ? spellInScale(root, scale, pc) : parsed ? spellInChord(parsed.root, parsed.quality, pc) : null
    setHeard(`String ${pos.string}, fret ${pos.fret}, ${note ? prettyNote(spelledName(midi, note)) : midi}`)
  }

  return (
    <>
      <form className={styles.controls} onSubmit={(e) => e.preventDefault()}>
        {controls}
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
              <select value={root} onChange={(e) => setRoot(e.target.value as SpelledNote)}>
                {ROOTS.map((r) => (
                  <option key={r} value={r}>
                    {prettyNote(r)}
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
              value={chordInput}
              onChange={(e) => setChord(e.target.value)}
              aria-invalid={invalid}
              aria-describedby={invalid ? statusId : undefined}
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

      <h2 className={styles.sectionTitle}>{invalid ? 'Chord tones' : subject[0]!.toUpperCase() + subject.slice(1)}</h2>
      {markers && (
        <div className={styles.board}>
          <Fretboard
            setup={setup}
            markers={markers}
            frets={frets}
            leftHanded={leftHanded}
            onSelect={audition}
            label={`${subject}, frets ${frets[0]} to ${frets[1]}; roots marked`}
          />
        </div>
      )}
      {/* One live region for both: what you tapped, or why there's no board. */}
      <p id={statusId} className={invalid ? styles.missing : styles.meta} role="status" aria-live="polite">
        {invalid ? `Unknown chord symbol “${chordInput}”. Try G, Em, D7, Cmaj7, Asus4.` : heard || 'Click a note to hear it.'}
      </p>
    </>
  )
}

function clampInt(v: string, lo: number, hi: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo
}
