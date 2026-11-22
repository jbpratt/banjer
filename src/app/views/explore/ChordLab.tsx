import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Setup, TuningId } from '../../../domain/types.ts'
import {
  LAB_QUALITIES,
  QUALITY_RULES,
  TUNINGS,
  droneDegree,
  isVoicingOf,
  openMidi,
  pitchClass,
  prettyNote,
  sameNotesAs,
  shapeMidis,
  soundingMidi,
  spellInChord,
} from '../../../theory/index.ts'
import type { SpelledNote } from '../../../theory/index.ts'
import { ChordDiagram, Fretboard, chordWindow } from '../../../ui/instrument/index.ts'
import { getEngine } from '../../audio.ts'
import type { Content } from '../../content.ts'
import { formatRoute } from '../../routes.ts'
import viewStyles from '../Views.module.css'
import styles from './Explore.module.css'
import {
  QUALITY_NAMES,
  STRETCH_SPAN,
  cardPosition,
  chordTitle,
  degreeText,
  formulaText,
  fretSpan,
  labCards,
  labMarkers,
  lowestFretted,
  moveText,
  rootOptions,
  spellingText,
  strumMidis,
  voicingShape,
} from './lab.ts'
import type { LabLabels } from './lab.ts'

interface Props {
  content: Content
  tuning: TuningId
  root: SpelledNote
  quality: string
  labels: LabLabels
  leftHanded: boolean
  /** Explore's shared toolbar controls (tuning, labels), rendered after Root. */
  controls: ReactNode
  onChord: (root: SpelledNote, quality: string) => void
}

const BOARD_FRETS: [number, number] = [0, 15]
const COMPARE_GAP_MS = 900

export function ChordLab({ content, tuning, root, quality, labels, leftHanded, controls, onChord }: Props) {
  const setup: Setup = useMemo(() => ({ tuning, capo: 0 }), [tuning])
  const cards = useMemo(() => labCards(setup, root, quality), [setup, root, quality])
  const firstReachable = Math.max(0, cards.findIndex((c) => c.voicing))
  // A new chord or tuning starts on its first playable shape. Derived during render, so the
  // old selection never paints against the new cards.
  const chordKey = `${tuning}|${root}|${quality}`
  const [picked, setPicked] = useState({ key: chordKey, index: firstReachable })
  const selected = picked.key === chordKey ? picked.index : firstReachable
  const select = (index: number) => setPicked({ key: chordKey, index })

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
  const same = useMemo(() => sameNotesAs(root, quality), [root, quality])

  // Same symbol, or any library shape that spells this chord (ignoring the drone, which may clash).
  const library = useMemo(
    () =>
      content.SHAPES.filter(
        (s) =>
          s.tuning === tuning &&
          (s.symbol === symbol || isVoicingOf(shapeMidis(setup, { ...s, frets: [s.frets[0], s.frets[1], s.frets[2], s.frets[3], null] }), symbol)),
      ),
    [content, tuning, setup, symbol],
  )

  const shapes = useMemo(
    () => cards.map((c) => (c.voicing ? voicingShape(setup, symbol, c.voicing.frets, droneFits) : null)),
    [cards, setup, symbol, droneFits],
  )
  // One box height for every card, so diagrams and their degree rows line up.
  const rows = Math.max(4, ...shapes.map((s) => (s ? chordWindow(s)[1] : 0)))

  // Render what can be strummed from this screen before anyone taps it.
  useEffect(() => {
    const midis: number[] = []
    for (const c of cards) {
      if (!c.voicing) continue
      midis.push(...strumMidis(setup, c.voicing.frets, droneFits), ...strumMidis(setup, c.form.frets, droneDegree(setup, root, '') !== null))
    }
    for (const s of library) midis.push(...shapeMidis(setup, s))
    engine.prewarm(midis)
  }, [cards, library, setup, root, droneFits, engine])

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

  const droneNote = prettyNote(spellInChord(root, quality, pitchClass(openMidi(setup, 5))))

  return (
    <>
      <div className={viewStyles.controls}>
        <label className={viewStyles.field}>
          Root
          <select value={root} onChange={(e) => onChord(e.target.value as SpelledNote, quality)}>
            {rootOptions(root).map((r) => (
              <option key={r} value={r}>
                {prettyNote(r)}
              </option>
            ))}
          </select>
        </label>
        {controls}
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
        <h2 className={styles.ruleTitle}>
          {title} <span className={styles.formula}>{formulaText(quality)}</span>
        </h2>
        <p className={styles.spelling}>{spellingText(root, quality)}</p>
        <p>{QUALITY_RULES[quality]}</p>
        {same.length > 0 && (
          <p className={viewStyles.meta}>
            Same notes as:{' '}
            {same.map((c, i) => (
              <span key={c.symbol}>
                {i > 0 && ', '}
                <a href={formatRoute({ view: 'explore', mode: 'chords', subject: c.symbol })}>{chordTitle(c.root, c.quality)}</a>
              </span>
            ))}
          </p>
        )}
        <p className={viewStyles.meta}>
          5th string ({droneNote}):{' '}
          {droneFits ? `fits as the ${degreeText(drone!)}; let it ring.` : 'not in this chord; skip it or fret it.'}
        </p>
      </div>

      <div className={styles.board}>
        <Fretboard
          setup={setup}
          markers={markers}
          frets={BOARD_FRETS}
          leftHanded={leftHanded}
          {...(sel?.voicing ? { focusFret: sel.voicing.lowestFret ?? 0 } : {})}
          onSelect={(pos) => engine.audition([soundingMidi(setup, pos)])}
          label={`${title} shapes up the neck${sel?.voicing ? `; selected shape at ${cardPosition(sel)}` : ''}`}
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
          const shape = shapes[i]
          const name = c.form.nickname ?? `${c.form.stack} shape`
          const where = cardPosition(c)
          const span = v ? fretSpan(v.frets) : 0
          return (
            <li key={c.form.frets.join('-')} className={styles.card} data-selected={i === selected || undefined}>
              {v && shape ? (
                <button
                  type="button"
                  className={styles.cardButton}
                  aria-pressed={i === selected}
                  aria-label={`${title}, ${name}, ${where}. Select and strum.`}
                  onClick={() => {
                    select(i)
                    strum(i)
                  }}
                >
                  <ChordDiagram
                    shape={shape}
                    size="lg"
                    rows={rows}
                    showFingers={false}
                    intervalLabels={v.degrees.map(degreeText)}
                    highlight={v.moves.map((m) => m.string)}
                  />
                </button>
              ) : (
                <div className={styles.unreachable}>
                  <span className={styles.unreachableName}>{title}</span>
                  <p>{c.unreachable?.text ?? 'Not reachable from this shape.'}</p>
                </div>
              )}
              <div className={styles.cardText}>
                <p className={styles.cardName}>
                  {name} <span className={viewStyles.meta}>{where}</span>
                </p>
                <p className={styles.stack}>
                  <span className="visually-hidden">Degrees from string 4 to string 1: </span>
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
                {span >= STRETCH_SPAN && (
                  <p className={styles.stretch}>
                    Stretch: a {span}-fret reach, frets {lowestFretted(v!.frets)}–{Math.max(...v!.frets)}.
                  </p>
                )}
                {v && v.moves.length > 0 && (
                  <button type="button" className={styles.small} onClick={() => compare(i)}>
                    Hear major → {title}
                    <span className="visually-hidden">, {name}, {where}</span>
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
                aria-label={`Strum ${prettyNote(s.symbol)}`}
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
