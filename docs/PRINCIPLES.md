# Banjer — First Principles

A personal theory workbench for 5-string clawhammer banjo. It shows chord shapes,
scales and keys on a real fretboard and plays them, so you can see *why* shapes work:
which string carries the root, 3rd and 5th, and which single note moves to change a chord's
quality. Claude extends it as the learner's theory grows.

## The learner

- 5-string banjo, clawhammer / old-time style; has played some banjo.
- Knows: the three open-G major-triad shapes cycling up the neck (5 1 3 5, 1 3 5 1,
  3 5 1 3), minor as a flattened 3rd, the major-scale step pattern, and diatonic chord
  qualities. Working on 7th chords.

## Product principles

1. **Explore is the product.** Chord lab, keys, and scales. No curriculum, queue, or
   practice log.
2. **Invariants over memorization.** Show every chord as an edit of a shape you already
   know (lower the 3rd → minor; lower a root two frets → ♭7), with the degree on every
   string.
3. **See it, hear it.** Everything on the board can be heard; comparisons play back to
   back.
4. **Linkable.** Every chord and key has a URL (`#/explore/chords/D7`), so Claude can point
   at exactly the thing to look at.
5. **Proven theory.** If the lab says a shape is G7, a test says so too.

## Music-model principles

- **Pitch is a MIDI number.** Spelling (C♯ vs D♭) is derived from key context and is
  never the identity of a note.
- **Positions are (string, fret).** Strings are numbered 1 (high D in open G) to 5
  (short drone string), matching banjo tab. The 5th string begins at the 5th fret: its
  fret is either 0 (open) or an absolute neck fret ≥ 6, as written in tab.
- **Tuning and capo are data.** Nothing assumes open G. Fret numbers on strings 1–4 are
  relative to the capo, as in tab.
- **The theory core is pure and proven.** No React or DOM in `src/theory`. If the
  fretboard says it's a G chord, a test says so too.

## Design principles

- **The fretboard is the hero.** Draw it physically plausible: equal-tempered fret
  spacing, the 5th-string peg at fret 5, and banjo inlays at 3, 5, 7, 10, 12, 15, 17,
  19, 22.
- **Never encode with color alone.** Use shape + color + label (colorblind-safe).
- **Calm, warm, crafted.** One accent color. Little motion.
- **Light and dark are both first-class.** Respect `prefers-reduced-motion`.
- **Accessible by construction.** Semantic HTML, visible focus, labelled controls.

## Architecture principles

- **Stack:** React + TypeScript + Vite, CSS Modules + CSS custom-property tokens,
  Vitest. No other runtime dependency without asking.
- **Layers** (imports point downward only):

  | Layer | Path | Rule |
  | --- | --- | --- |
  | Domain | `src/domain` | Types only. The contract everyone builds against. |
  | Theory | `src/theory` | Pure music logic. Fully unit-tested. |
  | Audio | `src/audio` | Web Audio banjo synth for auditioning notes and chords. No React. |
  | Instrument views | `src/ui/instrument` | Fretboard, chord diagram. Props in, no global state. |
  | App | `src/app` | Shell, Explore views, settings. |
  | Content | `content/` | The chord-shape library. Authored by Claude. |

- **Schedule sound on the audio clock.** Notes start at `AudioContext` times (use
  `audition`'s `delayMs`), never via `setTimeout`.
- **Static-build friendly.** No backend; settings live in `localStorage`.

## Non-goals for v1

- Mic listening or grading
- Lessons, practice queues, or progress tracking (removed 2026-11-21 by request)
- Accounts, sync, or any backend
- Playback of tunes, metronome, or tab (removed 2026-11-21 by request)
- Standard notation
- Three-finger / bluegrass content (the model supports it; the content doesn't)
- In-app Claude chat (the schema is ready for it)
