import type { ChordShape, Finger, ScaleId, Setup, StringNum } from '../domain/types.ts'
import type { FretMarker } from '../ui/instrument/types.ts'
import {
  TUNINGS,
  intervalLabel,
  parseChord,
  pcOf,
  pitchClass,
  positionsWhere,
  prettyNote,
  scalePositions,
  soundingMidi,
  spell,
  spellInChord,
} from '../theory/index.ts'
import type { SpelledNote } from '../theory/index.ts'
import type { LabelMode } from './settings.ts'

export type LabelKind = 'note' | 'interval' | 'finger' | 'none'

/** `auto` means intervals: shapes and scales read best as degrees. */
export function resolveLabels(setting: LabelMode, _context: 'shape' | 'scale' | 'explore'): LabelKind {
  return setting === 'auto' ? 'interval' : setting
}

/** N cycles interval → note → finger. */
export function cycleLabels(k: LabelKind): LabelKind {
  return k === 'interval' ? 'note' : k === 'note' ? 'finger' : 'interval'
}

/** 'Bbm7b5' → 'B♭m7♭5', 'F##' → 'F𝄪'. */
export function prettyAccidentals(s: string): string {
  return prettyNote(s)
}

const ACCIDENTAL_WORD: Readonly<Record<string, string>> = { '#': ' sharp', b: ' flat', '##': ' double sharp', bb: ' double flat' }

/** How a screen reader should say a spelled note: 'Bb' → 'B flat'. */
export function spokenNote(n: SpelledNote): string {
  return n[0]! + (ACCIDENTAL_WORD[n.slice(1)] ?? '')
}

export function intervalText(rootPc: number, pc: number): string {
  const l = intervalLabel(rootPc, pc)
  return l === '1' ? 'R' : prettyAccidentals(l)
}

export function noteText(midi: number, key?: SpelledNote): string {
  return prettyNote(spell(pitchClass(midi), key, false))
}

/** The key a setup sounds in by default: the tuning's home key moved by the capo. */
export function setupKey(setup: Setup): SpelledNote {
  const home = TUNINGS[setup.tuning].homeKeys[0] ?? 'G'
  return spell(pcOf(home) + setup.capo)
}

interface LabelCtx {
  kind: LabelKind
  rootPc: number
  /** Spells a sounding pitch class for this context (chord tone by degree, scale note by letter). */
  name: (pc: number) => SpelledNote
}

function marker(ctx: LabelCtx, m: FretMarker, midi: number, finger?: Finger | null): FretMarker {
  const note = ctx.name(pitchClass(midi))
  m.spoken = spokenNote(note)
  switch (ctx.kind) {
    case 'note':
      m.label = prettyNote(note)
      break
    case 'interval':
      m.label = intervalText(ctx.rootPc, pitchClass(midi))
      break
    case 'finger':
      if (finger != null) m.label = String(finger)
      break
    case 'none':
      break
  }
  return m
}

/** Chord shape as fretboard markers: root vs chord tones, unplayed strings muted. */
export function shapeMarkers(shape: ChordShape, kind: LabelKind, capo = 0): FretMarker[] {
  const setup: Setup = { tuning: shape.tuning, capo }
  const parsed = parseChord(shape.symbol)
  const key = parsed?.root ?? setupKey(setup)
  const rootPc = pcOf(key)
  const ctx: LabelCtx = { kind, rootPc, name: (pc) => (parsed ? spellInChord(parsed.root, parsed.quality, pc) : spell(pc, key)) }
  const out: FretMarker[] = []
  shape.frets.forEach((fret, i) => {
    const string = (i + 1) as StringNum
    if (fret === null) {
      out.push({ pos: { string, fret: 0 }, role: 'muted' })
      return
    }
    const pos = { string, fret }
    const midi = soundingMidi(setup, pos)
    const finger = shape.fingers?.[i]
    const m = marker(ctx, { pos, role: pitchClass(midi) === rootPc ? 'root' : 'chord' }, midi, finger)
    if (finger) m.finger = finger
    out.push(m)
  })
  return out
}

export function scaleMarkers(
  setup: Setup,
  root: SpelledNote,
  scale: ScaleId,
  frets: readonly [number, number],
  kind: LabelKind,
): FretMarker[] {
  return scalePositions(setup, root, scale, frets).map((p) =>
    marker({ kind, rootPc: pcOf(root), name: () => p.note }, { pos: p.pos, role: p.isRoot ? 'root' : 'scale' }, p.midi),
  )
}

/** Every position in range that is a tone of `symbol`, root vs chord. Null for an unknown symbol. */
export function chordToneMarkers(
  setup: Setup,
  symbol: string,
  frets: readonly [number, number],
  kind: LabelKind,
): FretMarker[] | null {
  const parsed = parseChord(symbol)
  if (!parsed) return null
  const rootPc = pcOf(parsed.root)
  const pcs = new Set(parsed.pitchClasses)
  const ctx: LabelCtx = { kind, rootPc, name: (pc) => spellInChord(parsed.root, parsed.quality, pc) }
  return positionsWhere(setup, frets, (m) => pcs.has(pitchClass(m))).map((pos) => {
    const midi = soundingMidi(setup, pos)
    return marker(ctx, { pos, role: pitchClass(midi) === rootPc ? 'root' : 'chord' }, midi)
  })
}
