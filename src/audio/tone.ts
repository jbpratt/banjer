/**
 * Pre-rendered tone colors. Auditions use `bright`; the others are kept as timbre presets.
 * - bright: nail strike
 * - round: thumb flesh
 * - legato: left hand only, no pick transient
 */
export type Variant = 'bright' | 'round' | 'legato'

export interface VariantTone {
  /**
   * Where the string is struck, as a fraction of its length from the bridge. Harmonics at
   * multiples of 1/pickPosition vanish. Near 0 = thin and bright; 0.5 = hollow.
   */
  pickPosition: number
  /** Spectral slope of the strike: harmonic k starts at 1/k^tilt. 0 = harsh, 1 = struck, 2 = soft pluck. */
  tilt: number
  /** Corner frequency of the striking surface, Hz. Hard nail is high; thumb flesh is low. */
  softHz: number
  /** Level of the nail "tick" at the attack, relative to the string. 0 = none. */
  snap: number
  /** Scales the head thump (`body.plunk.gain`) for this variant. */
  plunk: number
  /** Raised-cosine fade-in, ms. Softens the attack of left-hand notes. */
  fadeInMs: number
}

/**
 * Every by-ear knob for Banjer's sound. Tune here, save, and reload the page: rendered notes
 * are cached per pitch, so a hot update alone won't re-render them.
 *
 * Gains are linear (1 = unity) unless the name ends in Db. Times are seconds unless the
 * name ends in Ms. Pitches are MIDI numbers.
 */
export const TONE = {
  /** The plucked string: a Karplus–Strong loop tuned per pitch. */
  string: {
    /** Seconds for the fundamental to fall 60 dB at MIDI 48 (C3, the lowest open string we expect). */
    sustainLow: 2.2,
    /** The same at MIDI 88 (E6). Pitches between interpolate exponentially; outside, they clamp. */
    sustainHigh: 0.6,
    /**
     * Brightness: seconds for a partial at `sparkleHz` to fall 60 dB. Shorter is darker and
     * plunkier; longer rings with more shimmer (more guitar-like). Low notes can't lose their
     * highs much faster than ~0.5 s; the loop filter saturates there.
     */
    sparkleHz: 4000,
    sparkleSustain: 0.3,
    /** Share of the level that falls away just after the attack: the banjo's quick "ping". 0 = plain decay. */
    attackDrop: 0.4,
    /** Time constant of that early fall, ms. */
    attackDropMs: 80,
    /** Rendered length as a fraction of the fundamental's 60 dB time. The rest is inaudible. */
    length: 0.85,
    /** Raised-cosine fade at the end of each rendered note, ms. */
    tailFadeMs: 40,
    /** Peak level of every rendered note before playback gain. Keep ≤ 1. */
    peak: 0.9,
  },

  /** The pot: a drum head under the bridge. Applied to every rendered note. */
  body: {
    /** Main head resonance (bandpass mixed in with the string). */
    head: { hz: 380, q: 3, gain: 0.9 },
    /** Upper-mid "twang" band, the banjo's honk. */
    twang: { hz: 2400, q: 1.3, gain: 0.7 },
    /** The head's own thump at the attack: a decaying sine. `gain` is relative to the string's peak. */
    plunk: { hz: 220, decayMs: 40, gain: 0.3 },
  },

  variants: {
    bright: { pickPosition: 0.2, tilt: 0.7, softHz: 7000, snap: 0.25, plunk: 1, fadeInMs: 0 },
    round: { pickPosition: 0.28, tilt: 1, softHz: 2000, snap: 0.06, plunk: 0.8, fadeInMs: 0.8 },
    legato: { pickPosition: 0.35, tilt: 1.3, softHz: 1500, snap: 0, plunk: 0.1, fadeInMs: 6 },
  } satisfies Record<Variant, VariantTone>,

  /** Release when re-sounding a pitch damps the one already ringing. */
  damp: { releaseMs: 40 },

  /** `audition()` (fretboard taps, chord previews). */
  audition: { gain: 0.9 },

  /** Master chain: headroom → compressor/limiter → volume → speakers. */
  mix: {
    /** Gain into the compressor. Lower = more headroom for brushes and chords. */
    headroom: 0.5,
    compressor: { thresholdDb: -8, kneeDb: 6, ratio: 12, attack: 0.002, release: 0.12 },
    /** `stop()` fade, ms. */
    stopFadeMs: 60,
  },

  /** The click track: a short woodblock-ish tick, a damped sine burst rendered once per kind. */
  metronome: {
    /** Beat 1 when accent is on: higher and louder. `gain` is the rendered peak; keep ≤ 0.9. */
    accent: { hz: 2400, gain: 0.9 },
    /** Every other beat. */
    beat: { hz: 1600, gain: 0.65 },
    /** The off-beat eighth ("ditty"), softer so the pulse stays on the beat. */
    sub: { hz: 1600, gain: 0.35 },
    /** An inharmonic upper partial, as a ratio of `hz`, for the wood. Level relative to the fundamental. */
    overtone: { ratio: 2.7, level: 0.25 },
    /** Time constant of the exponential decay, ms. Shorter is drier and tickier. */
    decayMs: 6,
    /** Raised-cosine fade-in, ms. Just enough to keep the attack from popping. */
    attackMs: 0.4,
    /** Rendered length, ms; the decay is inaudible well before the end. */
    lengthMs: 35,
    /** Level of the click bus into the master mix. */
    gain: 0.8,
    /** `metronome.stop()` fade, ms. */
    stopFadeMs: 30,
  },
}
