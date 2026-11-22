import type { Midi } from '../domain/types.ts'

export interface AuditionOptions {
  /** Milliseconds between successive strings, for strumming a chord. Default 0. */
  strumMs?: number
  /** Start this long from now, on the audio clock (e.g. the second chord of a comparison). Default 0. */
  delayMs?: number
}

/** The app's only handle on sound. Everything is scheduled on the AudioContext clock. */
export interface AudioEngine {
  /** Create or resume the AudioContext. Call from a user gesture before first sound. Idempotent. */
  unlock(): Promise<void>
  /** Sound pitches, e.g. tapping the fretboard or strumming a chord shape. */
  audition(midis: readonly Midi[], opts?: AuditionOptions): void
  /** Fade out everything sounding. */
  stop(): void
  /** Master volume, 0–1. */
  setVolume(volume: number): void
}
