import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Position, ScaleId, Setup, TuningId } from '../../../domain/types.ts'
import { CHORD_QUALITIES, FRET_COUNT, SCALES, pitchClass, prettyNote, soundingMidi, spellInChord, spellInScale, spelledName } from '../../../theory/index.ts'
import type { SpelledNote } from '../../../theory/index.ts'
import { ChoiceChips } from '../../../ui/controls/Chips.tsx'
import { RootPicker } from '../../../ui/controls/RootPicker.tsx'
import { Segmented } from '../../../ui/controls/Segmented.tsx'
import { Toolbar } from '../../../ui/controls/Toolbar.tsx'
import { Fretboard, PitchRing } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import { chordToneMarkers, scaleMarkers } from '../../markers.ts'
import styles from '../Views.module.css'
import exploreStyles from './Explore.module.css'
import { QUALITY_NAMES, chordRing, chordTitle, qualityGroups, scaleRing } from './lab.ts'
import type { LabLabels } from './lab.ts'

interface Props {
  tuning: TuningId
  labels: LabLabels
  leftHanded: boolean
  /** Explore's shared board setup (tuning, labels), first in the toolbar's setup row. */
  controls: ReactNode
}

const SHOW_OPTIONS = [
  { value: 'scale', label: 'Scale' },
  { value: 'chord', label: 'Chord tones' },
] as const

// Grouped by sound; inside a group its own word is dropped from what shows ("Major
// pentatonic" reads "Pentatonic" under Major) but kept in the accessible name.
const SCALE_CHIPS = (['Major', 'Minor'] as const).map((group) => ({
  label: group,
  options: Object.values(SCALES)
    .filter((s) => s.minor === (group === 'Minor'))
    .map((s) => {
      const rest = s.name.startsWith(`${group} `) ? s.name.slice(group.length + 1) : null
      return {
        value: s.id,
        label: rest ? (
          <>
            <span className="visually-hidden">{group} </span>
            {rest[0]!.toUpperCase() + rest.slice(1)}
          </>
        ) : (
          s.name
        ),
      }
    }),
}))

const QUALITY_CHIPS = qualityGroups(Object.keys(CHORD_QUALITIES)).map((g) => ({
  label: g.label,
  options: g.qualities.map((q) => ({ value: q, label: QUALITY_NAMES[q] ?? q })),
}))

/** Any scale or chord's tones across a fret range, with capo. */
export function ScaleView({ tuning, labels, leftHanded, controls }: Props) {
  const [capo, setCapo] = useState(0)
  const [what, setWhat] = useState<'scale' | 'chord'>('scale')
  const [root, setRoot] = useState<SpelledNote>('G')
  const [scale, setScale] = useState<ScaleId>('major-pentatonic')
  const [quality, setQuality] = useState('')
  const [lo, setLo] = useState(0)
  const [hi, setHi] = useState(12)
  const [heard, setHeard] = useState('')

  const chord = root + quality
  const setup: Setup = useMemo(() => ({ tuning, capo }), [tuning, capo])
  const frets: [number, number] = [Math.min(lo, hi), Math.max(lo, hi)]
  const kind = labels === 'note' ? 'note' : 'interval'
  const markers = useMemo(
    () => (what === 'scale' ? scaleMarkers(setup, root, scale, frets, kind) : chordToneMarkers(setup, chord, frets, kind)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setup, what, root, scale, chord, frets[0], frets[1], kind],
  )
  const engine = getEngine()
  const ring = what === 'scale' ? scaleRing(root, scale) : chordRing(root, quality)

  useEffect(() => {
    if (markers) engine.prewarm(markers.map((m) => soundingMidi(setup, m.pos)))
  }, [markers, setup, engine])

  const subject =
    what === 'scale' ? `${prettyNote(root)} ${SCALES[scale].name.toLowerCase()} scale` : `${chordTitle(root, quality)} chord tones`

  function audition(pos: Position) {
    const midi = soundingMidi(setup, pos)
    engine.audition([midi])
    const pc = pitchClass(midi)
    const note = what === 'scale' ? spellInScale(root, scale, pc) : spellInChord(root, quality, pc)
    setHeard(`String ${pos.string}, fret ${pos.fret}, ${note ? prettyNote(spelledName(midi, note)) : midi}`)
  }

  return (
    <>
      <Toolbar
        subject={<RootPicker legend="Root" value={root} onChange={setRoot} />}
        detail={
          <>
            <Segmented legend="Show" options={SHOW_OPTIONS} value={what} onChange={setWhat} />
            {what === 'scale' ? (
              <ChoiceChips legend="Scale" layout="wide" groups={SCALE_CHIPS} value={scale} onChange={setScale} />
            ) : (
              <ChoiceChips legend="Quality" groups={QUALITY_CHIPS} value={quality} onChange={setQuality} />
            )}
          </>
        }
        setup={
          <>
            {controls}
            <label className={styles.field}>
              Capo
              <input type="number" min={0} max={9} value={capo} onChange={(e) => setCapo(clampInt(e.target.value, 0, 9))} />
            </label>
            <fieldset className={exploreStyles.range}>
              <legend>Frets</legend>
              <input
                type="number"
                aria-label="From fret"
                min={0}
                max={FRET_COUNT}
                value={lo}
                onChange={(e) => setLo(clampInt(e.target.value, 0, FRET_COUNT))}
              />
              <span aria-hidden="true">–</span>
              <input
                type="number"
                aria-label="To fret"
                min={0}
                max={FRET_COUNT}
                value={hi}
                onChange={(e) => setHi(clampInt(e.target.value, 0, FRET_COUNT))}
              />
            </fieldset>
          </>
        }
      />

      <h2 className={styles.sectionTitle}>{subject[0]!.toUpperCase() + subject.slice(1)}</h2>
      <figure className={exploreStyles.ringRow}>
        <PitchRing {...ring} />
        <figcaption className={styles.meta}>
          One octave, one fret per step, {ring.title} at the top.{' '}
          {what === 'scale'
            ? 'Gaps are the steps between notes: two positions is a whole step, H a half step, 1½ a minor 3rd. The same scale makes the same shape from any root.'
            : 'Its tones joined in stacking order, so you can see the 3rds it is built from.'}
        </figcaption>
      </figure>
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
