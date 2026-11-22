import { Fragment, useMemo, useState } from 'react'
import type { NoteName, Setup, TuningId } from '../../../domain/types.ts'
import { majorForms, majorKey } from '../../../theory/index.ts'
import type { DiatonicChord } from '../../../theory/index.ts'
import { Fretboard } from '../../../ui/instrument/index.ts'
import { formatRoute } from '../../routes.ts'
import { prettyAccidentals } from '../../markers.ts'
import viewStyles from '../Views.module.css'
import styles from './Explore.module.css'
import { LAB_ROOTS, keyMarkers } from './lab.ts'
import type { LabLabels } from './lab.ts'

interface Props {
  tuning: TuningId
  keyName: NoteName
  labels: LabLabels
  leftHanded: boolean
  onKey: (key: NoteName) => void
}

const BOARD_FRETS: [number, number] = [0, 12]

export function KeyView({ tuning, keyName, labels, leftHanded, onKey }: Props) {
  const setup: Setup = useMemo(() => ({ tuning, capo: 0 }), [tuning])
  const info = useMemo(() => majorKey(keyName), [keyName])
  const [focus, setFocus] = useState<{ symbol: string; label: string } | null>(null)
  const markers = useMemo(
    () => keyMarkers(setup, keyName, BOARD_FRETS, focus?.symbol ?? null, labels),
    [setup, keyName, focus, labels],
  )

  // Where a straight barre (all four strings at one fret) plays I, IV and V, in tunings that have one.
  const barreAt = (root: NoteName) => majorForms(setup, root).find((f) => f.frets.every((x) => x === f.frets[0]))?.position
  const hasBarre = barreAt(keyName) !== undefined

  const chip = (c: DiatonicChord, seventh: boolean) => {
    const symbol = c.root + (seventh ? c.seventh : c.triad)
    const numeral = seventh ? c.numeral7 : c.numeral
    const on = focus?.symbol === symbol
    return (
      <li key={symbol}>
        <button
          type="button"
          className={styles.degreeChip}
          aria-pressed={on}
          onClick={() => setFocus(on ? null : { symbol, label: `${numeral} (${prettyAccidentals(symbol)})` })}
        >
          <span className={styles.numeral}>{numeral}</span>
          <span className={styles.degreeChord}>{prettyAccidentals(symbol)}</span>
        </button>
      </li>
    )
  }

  return (
    <>
      <div className={viewStyles.controls}>
        <label className={viewStyles.field}>
          Key
          <select
            value={keyName}
            onChange={(e) => {
              setFocus(null)
              onKey(e.target.value as NoteName)
            }}
          >
            {LAB_ROOTS.map((r) => (
              <option key={r} value={r}>
                {prettyAccidentals(r)} major
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className={viewStyles.sectionTitle}>{prettyAccidentals(keyName)} major scale</h2>
      <ol className={styles.steps} role="list" aria-label="Notes with the whole and half steps between them">
        {[...info.notes, info.notes[0]!].map((n, i) => (
          <Fragment key={i}>
            <li className={styles.stepNote}>
              <span className={styles.stepName}>{prettyAccidentals(n)}</span>
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

      <h2 className={viewStyles.sectionTitle}>Chords in the key</h2>
      <p className={viewStyles.meta}>
        Stack every other note of the scale. Uppercase numerals are major, lowercase are minor, ° is diminished. Pick one
        to see its notes inside the scale.
      </p>
      <ol className={styles.degreeRow} role="list" aria-label="Triads">
        {info.chords.map((c) => chip(c, false))}
      </ol>
      <ol className={styles.degreeRow} role="list" aria-label="Seventh chords">
        {info.chords.map((c) => chip(c, true))}
      </ol>
      <p className={viewStyles.meta}>
        Sevenths add one more stacked note. Only V gets a plain 7 (dominant): that ♭7 is what pulls V back home to I.
      </p>

      <div className={styles.board}>
        <Fretboard
          setup={setup}
          markers={markers}
          frets={BOARD_FRETS}
          leftHanded={leftHanded}
          label={`${prettyAccidentals(keyName)} major scale numbered by degree${focus ? `, ${focus.label} highlighted` : ''}`}
        />
      </div>
      {focus && (
        <p className={viewStyles.meta}>
          <a href={formatRoute({ view: 'explore', mode: 'chords', subject: focus.symbol })}>
            Open {prettyAccidentals(focus.symbol)} in the chord lab →
          </a>
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
                  <span className={styles.numeral}>{c.numeral}</span> {prettyAccidentals(c.root)}:{' '}
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
