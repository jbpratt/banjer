import type { ChordShape, Finger, Position, Setup, StringNum } from '../../domain/types.ts'

/**
 * What a marker on the fretboard means.
 * - root: the root of the current key, scale, or chord
 * - chord: a chord tone
 * - scale: a scale tone
 * - melody: a single highlighted note (e.g. a selected position)
 * - thumb: the 5th-string drone / thumb note
 * - muted: a string that should not sound
 */
export type MarkerRole = 'root' | 'chord' | 'scale' | 'melody' | 'thumb' | 'muted'

/**
 * - active: sounding now
 * - next: the upcoming note, as a quiet ghost
 * - dim: context, de-emphasized
 * - undefined: normal (e.g. a scale shown at rest)
 */
export type MarkerState = 'active' | 'next' | 'dim'

export interface FretMarker {
  pos: Position
  role: MarkerRole
  /** Text inside the marker: note name, interval, or finger. At most 2 characters. */
  label?: string
  state?: MarkerState
  /** Left-hand finger to show with the marker. */
  finger?: Finger
  /**
   * The note as a screen reader should say it, spelled for the key: "B flat", "F sharp".
   * Without it the board spells from the label when that is a note name, else with sharps.
   */
  spoken?: string
  /**
   * What this marker's state means here, read after the note: "selected shape", "other
   * position", "moved from here". Defaults: active "sounding", next "upcoming", dim "context".
   */
  stateText?: string
}

export interface FretboardProps {
  /** Tuning, capo, and spike; drives open-string names and capo/spike drawing. */
  setup: Setup
  markers: readonly FretMarker[]
  /** Inclusive range of absolute neck frets to draw. Default [0, 12]. */
  frets?: readonly [number, number]
  /** Mirror horizontally for left-handed players. */
  leftHanded?: boolean
  /** Label open strings with note names at the nut. Default true. */
  showOpenNames?: boolean
  /**
   * Inclusive range of absolute neck frets to bring into view when the board is too wide for
   * its container and scrolls (phones), e.g. the selected shape; 0 means the nut, and brings
   * the open-string names into view with it. Without it the board centres on active markers,
   * or on the un-dimmed ones when the rest are dimmed and they sit within a few frets;
   * otherwise it starts at the nut.
   */
  focus?: readonly [number, number]
  /** Called when a position is clicked or tapped, e.g. to audition the note. */
  onSelect?: (pos: Position) => void
  /** Accessible description of what is shown, e.g. "G major scale, frets 0 to 7". */
  label: string
  className?: string
}

export interface ChordDiagramProps {
  shape: ChordShape
  /** 'current' = playing now; 'next' = coming up. Default 'none'. */
  emphasis?: 'current' | 'next' | 'none'
  size?: 'sm' | 'md' | 'lg'
  /** Show left-hand finger numbers. Default true. */
  showFingers?: boolean
  /**
   * Text for the row under the box (lg only), index 0 = string 1, shown as given. Overrides
   * the computed intervals, e.g. to spell ♯5 or 𝄫7 for the chord's quality.
   */
  intervalLabels?: readonly (string | null)[]
  /** Strings whose note to call out (e.g. the notes that moved from the major shape). */
  highlight?: readonly StringNum[]
  /**
   * Fret rows to draw, at least the shape's own. Pass the max over a set of diagrams shown
   * side by side so their boxes and label rows line up.
   */
  rows?: number
  className?: string
}

/** One note on a PitchRing. */
export interface RingNote {
  /** Semitones above the ring's tonic, 0–11. */
  semis: number
  /** Spelled name shown outside the ring: 'F♯'. */
  name: string
  /** Shown inside the marker: a degree ('5', '♭7') or 'R'. */
  label: string
  /** root ■, chord ●, scale ○: the fretboard's marker vocabulary. */
  role: 'root' | 'chord' | 'scale'
}

export interface PitchRingProps {
  /** In scale order from the tonic, which sits at 12 o'clock. */
  notes: readonly RingNote[]
  /** Draw the steps between consecutive notes (a scale), half steps marked. */
  steps?: boolean
  /** Semitones of a chord's tones in stacking order (1 3 5 7), joined as a polygon. */
  chord?: readonly number[]
  title: string
  subtitle?: string
  /** One-sentence summary for screen readers: "G major: G A B C D E F♯; D7 highlighted: D F♯ A C". */
  label: string
}
