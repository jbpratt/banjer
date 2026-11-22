import { useEffect, useMemo, useState } from 'react'
import type { NoteName, Setup, TuningId } from '../../../domain/types.ts'
import { LAB_QUALITIES, QUALITY_RULES, TUNINGS, droneDegree, isVoicingOf, openMidi, shapeMidis, soundingMidi } from '../../../theory/index.ts'
import { ChordDiagram, Fretboard } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import type { Content } from '../../content.ts'
import { noteText, prettyAccidentals } from '../../markers.ts'
import viewStyles from '../Views.module.css'
import styles from './Explore.module.css'
import {
  LAB_ROOTS,
  QUALITY_NAMES,
  chordTitle,
  degreeText,
  formulaText,
  labCards,
  labMarkers,
  moveText,
  strumMidis,
  voicingShape,
} from './lab.ts'
import type { LabLabels } from './lab.ts'

interface Props {
  content: Content
  tuning: TuningId
  root: NoteName
  quality: string
  labels: LabLabels
  leftHanded: boolean
  onChord: (root: NoteName, quality: string) => void
}

const BOARD_FRETS: [number, number] = [0, 15]
const COMPARE_GAP_MS = 900

export function ChordLab({ content, tuning, root, quality, labels, leftHanded, onChord }: Props) {
  const setup: Setup = useMemo(() => ({ tuning, capo: 0 }), [tuning])
  const cards = useMemo(() => labCards(setup, root, quality), [setup, root, quality])
  const firstReachable = Math.max(0, cards.findIndex((c) => c.voicing))
  const [selected, setSelected] = useState(firstReachable)
  // A new chord or tuning starts on its first playable shape.
  useEffect(() => setSelected(firstReachable), [firstReachable, root, quality, tuning])

  const sel = cards[selected]
  const markers = useMemo(
    () => labMarkers(setup, root, quality, cards, selected, labels),
    [setup, root, quality, cards, selected, labels],
  )
  const symbol = root + quality
  const title = chordTitle(root, quality)
  const drone = droneDegree(setup, root, quality)
  const droneFits = drone !== null
  const engine = getEngine()

  // Same symbol, or any library shape that spells this chord (ignoring the drone, which may clash).
  const library = content.SHAPES.filter(
    (s) => s.tuning === tuning && (s.symbol === symbol || isVoicingOf(shapeMidis(setup, { ...s, frets: [s.frets[0], s.frets[1], s.frets[2], s.frets[3], null] }), symbol)),
  )

  function strum(i: number) {
    const v = cards[i]?.voicing
    if (v) engine.audition(strumMidis(setup, v.frets, droneFits), { strumMs: 30 })
  }

  function compare(i: number) {
    const c = cards[i]
    if (!c?.voicing) return
    const majorDroneFits = droneDegree(setup, root, '') !== null
    engine.audition(strumMidis(setup, c.form.frets, majorDroneFits), { strumMs: 30 })
    engine.audition(strumMidis(setup, c.voicing.frets, droneFits), { strumMs: 30, delayMs: COMPARE_GAP_MS })
  }

  return (
    <>
      <div className={viewStyles.controls}>
        <label className={viewStyles.field}>
          Root
          <select value={root} onChange={(e) => onChord(e.target.value as NoteName, quality)}>
            {LAB_ROOTS.map((r) => (
              <option key={r} value={r}>
                {prettyAccidentals(r)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.qualities} role="group" aria-label="Chord quality">
        {LAB_QUALITIES.map((q) => (
          <button
            key={q}
            type="button"
            className={styles.chip}
            aria-pressed={q === quality}
            onClick={() => onChord(root, q)}
          >
            {QUALITY_NAMES[q] ?? q}
          </button>
        ))}
      </div>

      <div className={styles.rule}>
        <p className={styles.ruleTitle}>
          <strong>{title}</strong> <span className={styles.formula}>{formulaText(quality)}</span>
        </p>
        <p>{QUALITY_RULES[quality]}</p>
        <p className={viewStyles.meta}>
          5th string ({noteText(openMidi(setup, 5), root)}):{' '}
          {droneFits ? `fits as the ${degreeText(drone!)}; let it ring.` : 'not in this chord; skip it or fret it.'}
        </p>
      </div>

      <div className={styles.board}>
        <Fretboard
          setup={setup}
          markers={markers}
          frets={BOARD_FRETS}
          leftHanded={leftHanded}
          onSelect={(pos) => engine.audition([soundingMidi(setup, pos)])}
          label={`${title} shapes up the neck${sel?.voicing ? `; selected shape at fret ${sel.form.position}` : ''}`}
        />
      </div>
      <p className={viewStyles.meta}>
        Bold: the selected shape. Faint: the same chord elsewhere on the neck. Dashed: where a moved note sat in the major
        shape.
      </p>

      <h2 className={viewStyles.sectionTitle}>Up the neck, from the major shapes</h2>
      <ol className={styles.cards} role="list">
        {cards.map((c, i) => {
          const v = c.voicing
          const name = c.form.nickname ?? `${c.form.stack} shape`
          return (
            <li key={c.form.frets.join('-')} className={styles.card} data-selected={i === selected || undefined}>
              {v ? (
                <button
                  type="button"
                  className={styles.cardButton}
                  aria-pressed={i === selected}
                  aria-label={`${title}, ${name} at fret ${c.form.position}. Select and strum.`}
                  onClick={() => {
                    setSelected(i)
                    strum(i)
                  }}
                >
                  <ChordDiagram
                    shape={voicingShape(setup, symbol, v.frets, droneFits)}
                    size="lg"
                    showFingers={false}
                    intervalLabels={v.degrees.map(degreeText)}
                    highlight={v.moves.map((m) => m.string)}
                  />
                </button>
              ) : (
                <div className={styles.unreachable}>
                  <span className={styles.unreachableName}>{title}</span>
                  <p>Not from this shape here: it would need a note below the nut or drop the only root.</p>
                </div>
              )}
              <div className={styles.cardText}>
                <p className={styles.cardName}>
                  {name} <span className={viewStyles.meta}>fret {c.form.position}</span>
                </p>
                <p className={styles.stack} aria-label="Degrees from string 4 to string 1">
                  {c.form.stack.split(' ').map(degreeText).join(' ')}
                  {v && v.moves.length > 0 && <> → {[3, 2, 1, 0].map((k) => degreeText(v.degrees[k]!)).join(' ')}</>}
                </p>
                {v && v.moves.length > 0 && (
                  <ul className={styles.moves} role="list">
                    {v.moves.map((m) => (
                      <li key={m.string}>{moveText(m)}</li>
                    ))}
                  </ul>
                )}
                {v && v.moves.length > 0 && (
                  <button type="button" className={styles.small} onClick={() => compare(i)}>
                    Hear major → {title}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <h2 className={viewStyles.sectionTitle}>From the shape library</h2>
      {library.length === 0 ? (
        <p className={viewStyles.meta}>No library shapes for {title} in {TUNINGS[tuning].name} yet.</p>
      ) : (
        <ul className={viewStyles.shapeGrid} role="list">
          {library.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={viewStyles.shapeButton}
                aria-label={`Strum ${s.symbol}`}
                onClick={() => engine.audition(shapeMidis(setup, s).reverse(), { strumMs: 25 })}
              >
                <ChordDiagram shape={s} size="lg" />
              </button>
              {s.note && <p className={styles.libraryNote}>{s.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
