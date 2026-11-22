import type { ChordShape, Finger, NoteName, ScaleId, Setup, StringNum } from '../domain/types.ts'
import type { FretMarker } from '../ui/instrument/types.ts'
import {
  TUNINGS,
  intervalLabel,
  parseChord,
  pcOf,
  pitchClass,
  positionsWhere,
  scalePositions,
  soundingMidi,
  spell,
} from '../theory/index.ts'
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

export function prettyAccidentals(s: string): string {
  return s.replace(/#/g, '♯').replace(/b/g, '♭')
}

export function intervalText(rootPc: number, pc: number): string {
  const l = intervalLabel(rootPc, pc)
  return l === '1' ? 'R' : prettyAccidentals(l)
}

export function noteText(midi: number, key?: NoteName): string {
  return prettyAccidentals(spell(pitchClass(midi), key))
}

/** The key a setup sounds in by default: the tuning's home key moved by the capo. */
export function setupKey(setup: Setup): NoteName {
  const home = TUNINGS[setup.tuning].homeKeys[0] ?? 'G'
  return spell(pcOf(home) + setup.capo)
}

interface LabelCtx {
  kind: LabelKind
  rootPc: number
  key: NoteName
}

function label(ctx: LabelCtx, midi: number, finger?: Finger | null): string | undefined {
  switch (ctx.kind) {
    case 'note':
      return noteText(midi, ctx.key)
    case 'interval':
      return intervalText(ctx.rootPc, pitchClass(midi))
    case 'finger':
      return finger == null ? undefined : String(finger)
    case 'none':
      return undefined
  }
}

/** Chord shape as fretboard markers: root vs chord tones, unplayed strings muted. */
export function shapeMarkers(shape: ChordShape, kind: LabelKind, capo = 0): FretMarker[] {
  const setup: Setup = { tuning: shape.tuning, capo }
  const parsed = parseChord(shape.symbol)
  const rootPc = parsed ? pcOf(parsed.root) : pcOf(setupKey(setup))
  const ctx: LabelCtx = { kind, rootPc, key: parsed?.root ?? setupKey(setup) }
  const out: FretMarker[] = []
  shape.frets.forEach((fret, i) => {
    const string = (i + 1) as StringNum
    if (fret === null) {
      out.push({ pos: { string, fret: 0 }, role: 'muted' })
      return
    }
    const pos = { string, fret }
    const midi = soundingMidi(setup, pos)
    const m: FretMarker = { pos, role: pitchClass(midi) === rootPc ? 'root' : 'chord' }
    const finger = shape.fingers?.[i]
    const l = label(ctx, midi, finger)
    if (l) m.label = l
    if (finger) m.finger = finger
    out.push(m)
  })
  return out
}

export function scaleMarkers(
  setup: Setup,
  root: NoteName,
  scale: ScaleId,
  frets: readonly [number, number],
  kind: LabelKind,
): FretMarker[] {
  const ctx: LabelCtx = { kind, rootPc: pcOf(root), key: root }
  return scalePositions(setup, root, scale, frets).map((p) => {
    const m: FretMarker = { pos: p.pos, role: p.isRoot ? 'root' : 'scale' }
    const l = label(ctx, p.midi)
    if (l) m.label = l
    return m
  })
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
  const ctx: LabelCtx = { kind, rootPc, key: parsed.root }
  return positionsWhere(setup, frets, (m) => pcs.has(pitchClass(m))).map((pos) => {
    const midi = soundingMidi(setup, pos)
    const m: FretMarker = { pos, role: pitchClass(midi) === rootPc ? 'root' : 'chord' }
    const l = label(ctx, midi)
    if (l) m.label = l
    return m
  })
}
