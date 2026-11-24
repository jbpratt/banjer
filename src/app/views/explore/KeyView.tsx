import { Fragment, useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Setup, TuningId } from '../../../domain/types.ts'
import { majorForms, majorKey, prettyNote, relativeMinor, soundingMidi } from '../../../theory/index.ts'
import type { DiatonicChord, SpelledNote } from '../../../theory/index.ts'
import { ChipGroup, ChipSet, ToggleChip } from '../../../ui/controls/Chips.tsx'
import { RootPicker } from '../../../ui/controls/RootPicker.tsx'
import { Toolbar } from '../../../ui/controls/Toolbar.tsx'
import { Fretboard, PitchRing } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import { formatRoute } from '../../routes.ts'
import viewStyles from '../Views.module.css'
import styles from './Explore.module.css'
import { chordTitle, keyChordText, keyMarkers, keyRing } from './lab.ts'
import type { LabLabels } from './lab.ts'

interface Props {
  tuning: TuningId
  keyName: SpelledNote
  labels: LabLabels
  leftHanded: boolean
  /** Explore's shared board setup (tuning, labels), the toolbar's setup row. */
  controls: ReactNode
  onKey: (key: SpelledNote) => void
}

const BOARD_FRETS: [number, number] = [0, 12]

interface Focus {
  key: SpelledNote
  chord: DiatonicChord
  seventh: boolean
}

export function KeyView({ tuning, keyName, labels, leftHanded, controls, onKey }: Props) {
  const setup: Setup = useMemo(() => ({ tuning, capo: 0 }), [tuning])
  const info = useMemo(() => majorKey(keyName), [keyName])
  const [picked, setFocus] = useState<Focus | null>(null)
  // A focus belongs to its key; a new key (from the select or the URL) starts clear.
  const focus = picked?.key === keyName ? picked : null
  const focusSymbol = focus ? focus.chord.root + (focus.seventh ? focus.chord.seventh : focus.chord.triad) : null
  const markers = useMemo(
    () => keyMarkers(setup, keyName, BOARD_FRETS, focusSymbol, labels),
    [setup, keyName, focusSymbol, labels],
  )

  useEffect(() => {
    getEngine().prewarm(markers.map((m) => soundingMidi(setup, m.pos)))
  }, [markers, setup])

  // Where a straight barre (all four strings at one fret) plays I, IV and V, in tunings that have one.
  const barreAt = (root: SpelledNote) => majorForms(setup, root).find((f) => f.frets.every((x) => x === f.frets[0]))?.position
  const hasBarre = barreAt(keyName) !== undefined
  const keyTitle = prettyNote(keyName)
  const vi = info.chords[5]!
  const ring = useMemo(() => keyRing(info, focus), [info, focus])
  const chordsId = useId()

  const chip = (c: DiatonicChord, seventh: boolean) => {
    const symbol = c.root + (seventh ? c.seventh : c.triad)
    const numeral = seventh ? c.numeral7 : c.numeral
    const on = focusSymbol === symbol
    return (
      <ToggleChip key={symbol} variant="tile" pressed={on} onClick={() => setFocus(on ? null : { key: keyName, chord: c, seventh })}>
        <span className={styles.numeral}>{numeral}</span>
        <span className={styles.degreeChord}>{prettyNote(symbol)}</span>
      </ToggleChip>
    )
  }

  return (
    <>
      <Toolbar subject={<RootPicker legend="Key" value={keyName} onChange={onKey} suffix=" major" />} setup={controls} />

      <h2 className={viewStyles.sectionTitle}>{keyTitle} major scale</h2>
      <div className={styles.keyLayout}>
        <div className={styles.keyMain}>
          <ol className={styles.steps} role="list" aria-label="Notes with the whole and half steps between them">
            {[...info.notes, info.notes[0]!].map((n, i) => (
              <Fragment key={i}>
                <li className={styles.stepNote}>
                  <span className={styles.stepName}>{prettyNote(n)}</span>
                  <span className={styles.stepDegree}>{i === 7 ? 1 : i + 1}</span>
                </li>
                {i < 7 && (
                  <li className={styles.stepGap} data-half={info.steps[i] === 'H' || undefined} aria-label={info.steps[i] === 'H' ? 'half step' : 'whole step'}>
                    {info.steps[i]}
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
          <p className={viewStyles.meta}>
            Relative minor: <a href={formatRoute({ view: 'explore', mode: 'chords', subject: vi.root + vi.triad })}>{chordTitle(vi.root, vi.triad)}</a> (vi) uses
            the same notes, starting on {prettyNote(relativeMinor(keyName))}.
          </p>

          <h2 id={chordsId} className={viewStyles.sectionTitle}>
            Chords in the key
          </h2>
          <p className={viewStyles.meta}>
            Stack every other note of the scale. Uppercase numerals are major, lowercase are minor, ° is diminished, ø is
            half-diminished (m7♭5). Pick one to see its notes inside the scale.
          </p>
          <div className={styles.keyChips}>
            <ChipSet labelledBy={chordsId}>
              <ChipGroup label="Triads" layout="fill">
                {info.chords.map((c) => chip(c, false))}
              </ChipGroup>
              <ChipGroup label="7ths" layout="fill">
                {info.chords.map((c) => chip(c, true))}
              </ChipGroup>
            </ChipSet>
          </div>
          <p className={viewStyles.meta}>
            Sevenths add one more stacked note. Only V gets a plain 7 (dominant): that ♭7 is what pulls V back home to I.
          </p>
        </div>
        <figure className={styles.ringFigure}>
          <PitchRing {...ring} />
          <figcaption className={viewStyles.meta}>
            One octave, one fret per step, {keyTitle} at the top. Every major key makes this same shape: the half steps
            (H) always fall after 3 and 7.{focus ? ' The chord takes every other note.' : ''}
          </figcaption>
        </figure>
      </div>

      <p className={styles.keyChord} aria-live="polite">
        {focus && keyChordText(info, focus.chord, focus.seventh)}
      </p>
      <div className={styles.board}>
        <Fretboard
          setup={setup}
          markers={markers}
          frets={BOARD_FRETS}
          leftHanded={leftHanded}
          label={`${keyTitle} major scale numbered by degree${focus && focusSymbol ? `, ${focus.seventh ? focus.chord.numeral7 : focus.chord.numeral} (${prettyNote(focusSymbol)}) highlighted` : ''}`}
        />
      </div>
      {focusSymbol && (
        <p className={viewStyles.meta}>
          <a href={formatRoute({ view: 'explore', mode: 'chords', subject: focusSymbol })}>Open {prettyNote(focusSymbol)} in the chord lab →</a>
        </p>
      )}

      {hasBarre && (
        <>
          <h2 className={viewStyles.sectionTitle}>I, IV, V with one finger</h2>
          <p className={viewStyles.meta}>
            In this tuning a straight barre is a major chord, so the three most common chords in the key are three
            frets:
          </p>
          <ul className={styles.barres} role="list">
            {[0, 3, 4].map((d) => {
              const c = info.chords[d]!
              return (
                <li key={d}>
                  <span className={styles.numeral}>{c.numeral}</span> {prettyNote(c.root)}:{' '}
                  {barreAt(c.root) === 0 ? 'open strings' : `barre at fret ${barreAt(c.root)}`}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
