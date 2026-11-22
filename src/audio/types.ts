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
  /**
   * Sound pitches, e.g. tapping the fretboard or strumming a chord shape. If a pitch isn't
   * rendered yet, the whole call waits for it (and later calls queue behind it), so a cold
   * strum starts a little late but with its strings evenly spaced.
   */
  audition(midis: readonly Midi[], opts?: AuditionOptions): void
  /**
   * Render these pitches ahead of the rest of the background warm-up, off the main thread.
   * Call it with what's on screen (a chord's strum, the fretboard's sounding pitches) whenever
   * that changes; it's cheap, deduplicated, and needs no gesture: with workers it renders right
   * away, before unlock() (inline rendering waits for the context). The engine warms the whole
   * neck in the background anyway; this just picks the order.
   */
  prewarm(midis: Iterable<Midi>): void
  /** Fade out everything sounding. Also drops auditions still waiting on their buffers. */
  stop(): void
  /** Master volume, 0–1. */
  setVolume(volume: number): void
}
