import type { TuningId } from '../domain/types.ts'
import { TUNINGS } from '../theory/index.ts'

export type Theme = 'auto' | 'light' | 'dark'
/** `auto` uses the spec's per-kind defaults: intervals for shapes and scales. */
export type LabelMode = 'auto' | 'note' | 'interval' | 'finger' | 'none'

export interface Settings {
  theme: Theme
  leftHanded: boolean
  labels: LabelMode
  /** 0–1. */
  volume: number
  /** Explore's tuning, kept so it survives leaving Explore and reloads. */
  tuning: TuningId
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  leftHanded: false,
  labels: 'auto',
  volume: 0.8,
  tuning: 'open-g',
}

const THEMES: readonly Theme[] = ['auto', 'light', 'dark']
const LABELS: readonly LabelMode[] = ['auto', 'note', 'interval', 'finger', 'none']
const TUNING_IDS = Object.keys(TUNINGS) as TuningId[]

function pick<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
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
  }
}

export function nextTheme(t: Theme): Theme {
  return t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto'
}
