import type { TuningId } from '../domain/types.ts'
import { TUNINGS } from '../theory/index.ts'
import { clampBpm } from './tempo.ts'

export type Theme = 'auto' | 'light' | 'dark'
/** `auto` uses the spec's per-kind defaults: intervals for shapes and scales. */
export type LabelMode = 'auto' | 'note' | 'interval' | 'finger' | 'none'

/** The metronome's last-used setup. Whether it is running is not saved. */
export interface MetronomeSettings {
  bpm: number
  beatsPerBar: 2 | 3 | 4
  /** 1 = a click per beat, 2 = eighths. */
  subdivision: 1 | 2
  /** Louder, higher click on beat 1. */
  accent: boolean
  /** The transport strip is showing. */
  open: boolean
}

export interface Settings {
  theme: Theme
  leftHanded: boolean
  labels: LabelMode
  /** 0–1. */
  volume: number
  /** Explore's tuning, kept so it survives leaving Explore and reloads. */
  tuning: TuningId
  metronome: MetronomeSettings
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  leftHanded: false,
  labels: 'auto',
  volume: 0.8,
  tuning: 'open-g',
  // Old-time tunes are mostly in 2.
  metronome: { bpm: 96, beatsPerBar: 2, subdivision: 1, accent: true, open: false },
}

const THEMES: readonly Theme[] = ['auto', 'light', 'dark']
const LABELS: readonly LabelMode[] = ['auto', 'note', 'interval', 'finger', 'none']
const TUNING_IDS = Object.keys(TUNINGS) as TuningId[]

function pick<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

function parseMetronome(raw: unknown): MetronomeSettings {
  const d = DEFAULT_SETTINGS.metronome
  if (typeof raw !== 'object' || raw === null) return { ...d }
  const v = raw as Record<string, unknown>
  return {
    bpm: typeof v.bpm === 'number' && Number.isFinite(v.bpm) ? clampBpm(v.bpm) : d.bpm,
    beatsPerBar: pick(v.beatsPerBar, [2, 3, 4] as const, d.beatsPerBar),
    subdivision: pick(v.subdivision, [1, 2] as const, d.subdivision),
    accent: bool(v.accent, d.accent),
    open: bool(v.open, d.open),
  }
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS }
  let v: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS }
    v = parsed as Record<string, unknown>
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
  const d = DEFAULT_SETTINGS
  const volume = typeof v.volume === 'number' && Number.isFinite(v.volume) ? Math.min(1, Math.max(0, v.volume)) : d.volume
  return {
    theme: pick(v.theme, THEMES, d.theme),
    leftHanded: typeof v.leftHanded === 'boolean' ? v.leftHanded : d.leftHanded,
    labels: pick(v.labels, LABELS, d.labels),
    volume,
    tuning: pick(v.tuning, TUNING_IDS, d.tuning),
    metronome: parseMetronome(v.metronome),
  }
}

export function nextTheme(t: Theme): Theme {
  return t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto'
}
