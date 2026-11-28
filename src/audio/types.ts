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
  /** The click track. Shares this engine's context and volume; stop() doesn't silence it. */
  readonly metronome: Metronome
}

export interface MetronomeConfig {
  /** Quarter-note beats per minute, clamped to METRONOME_BPM. */
  bpm: number
  /** Beats per bar: 2, 3 or 4. */
  beatsPerBar: number
  /** Clicks per beat: 1 (beats) or 2 (eighths, the clawhammer "bum-ditty"). */
  subdivision: 1 | 2
  /** Louder, higher click on beat 1. */
  accent: boolean
}

export const METRONOME_BPM = { min: 40, max: 240 } as const

/** One click, reported to the UI around when it is heard. */
export interface Tick {
  /** 0-based beat within the bar. */
  beat: number
  /** 0-based subdivision within the beat (0 = on the beat). */
  sub: number
}

export interface Metronome {
  /** Start clicking (from beat 1) with this config; restarts if already running. Call from a gesture. */
  start(config: MetronomeConfig): void
  /**
   * Change config while running without losing the pulse: a new tempo applies from the
   * next click, a new meter from the next bar line. No-op when stopped.
   */
  update(config: MetronomeConfig): void
  stop(): void
  isRunning(): boolean
  /**
   * Called for each click near the moment it is heard (output latency included), for beat
   * lights only; sound is never driven by this. Also called with null on stop. Returns an
   * unsubscriber.
   */
  onTick(fn: (tick: Tick | null) => void): () => void
}
