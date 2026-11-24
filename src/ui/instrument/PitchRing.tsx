import { stepSizes } from '../../theory/index.ts'
import styles from './PitchRing.module.css'
import { NAME_R, RING_CENTER, RING_R, RING_SIZE, STEP_R, arcPath, polygonPoints, ringPoint, stepLabel } from './pitchRingGeometry.ts'
import type { PitchRingProps, RingNote } from './types.ts'

/** Marker sizes in SVG units: the fretboard's shapes, scaled to the ring. */
const D = 28
const SQUARE = D * 0.9

function Marker({ note }: { note: RingNote }) {
  const { x, y } = ringPoint(note.semis, RING_R)
  const long = note.label.length > 1
  return (
    <g className={styles[note.role]}>
      {note.role === 'root' ? (
        <rect className={styles.mark} x={x - SQUARE / 2} y={y - SQUARE / 2} width={SQUARE} height={SQUARE} rx={SQUARE * 0.16} />
      ) : (
        <circle className={styles.mark} cx={x} cy={y} r={note.role === 'scale' ? D * 0.45 : D / 2} />
      )}
      <text className={styles.degree} x={x} y={y} fontSize={long ? 11 : 13}>
        {note.label}
      </text>
    </g>
  )
}

/**
 * A one-octave pitch-class ring: twelve positions (one per fret), the tonic at the top,
 * notes rising clockwise. A scale's whole and half steps read as spacing, and a chord's
 * tones are joined in stacking order, so stacked 3rds show as "every other note".
 * Display only: one image with a summary for screen readers.
 */
export function PitchRing({ notes, steps = false, chord, title, subtitle, label }: PitchRingProps) {
  const on = new Set(notes.map((n) => n.semis))
  const gaps = steps ? stepSizes(notes.map((n) => n.semis)) : []
  return (
    <svg className={styles.ring} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} role="img" aria-label={label}>
      <circle className={styles.track} cx={RING_CENTER} cy={RING_CENTER} r={RING_R} />
      {Array.from({ length: 12 }, (_, s) => {
        if (on.has(s)) return null
        const p = ringPoint(s, RING_R)
        return <circle key={s} className={styles.empty} cx={p.x} cy={p.y} r={3.5} />
      })}
      {gaps.map((size, i) => {
        const from = notes[i]!.semis
        const text = stepLabel(size)
        const mid = ringPoint(from + size / 2, STEP_R)
        return (
          <g key={i} className={size === 1 ? styles.half : styles.step}>
            <path d={arcPath(from, from + size)} />
            {text && (
              <text x={mid.x} y={mid.y}>
                {text}
              </text>
            )}
          </g>
        )
      })}
      {chord && chord.length > 2 && <polygon className={styles.polygon} points={polygonPoints(chord)} />}
      {notes.map((n) => {
        const p = ringPoint(n.semis, NAME_R)
        return (
          <text key={`n${n.semis}`} className={styles.name} x={p.x} y={p.y}>
            {n.name}
          </text>
        )
      })}
      {notes.map((n) => (
        <Marker key={`m${n.semis}`} note={n} />
      ))}
      <text className={styles.title} x={RING_CENTER} y={RING_CENTER - (subtitle ? 6 : 0)}>
        {title}
      </text>
      {subtitle && (
        <text className={styles.subtitle} x={RING_CENTER} y={RING_CENTER + 18}>
          {subtitle}
        </text>
      )}
    </svg>
  )
}
