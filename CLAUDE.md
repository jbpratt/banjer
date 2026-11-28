# Banjer

A clawhammer banjo theory workbench: chord lab, keys, and scales on a real fretboard.
Read `docs/PRINCIPLES.md` before changing anything; it defines the conventions below.

## Commands

- `pnpm dev`: app at http://localhost:5173, with content hot reload
- `pnpm test`: Vitest (theory, voicings, audio, shape validation)
- `pnpm typecheck`: `tsc` (strict, `noUncheckedIndexedAccess`)
- `pnpm build`: typecheck + production build

## Deploy

GitHub Pages at https://jbpratt.github.io/banjer/ via `.github/workflows/pages.yml`: pushes to `main`
and PRs run install, typecheck, test, and build; a push to `main` then deploys `dist/`.
`base: './'` keeps asset and worker URLs relative, so it works under any subpath. Node comes from
`.nvmrc`; pnpm comes from `packageManager` in `package.json`.

## Layout

| Path | What |
| --- | --- |
| `src/domain/types.ts` | The contract: positions, tunings, setups, chord shapes |
| `src/theory/` | Pure music logic (pitch, neck, scales, chords, voicings, keys, validation) |
| `src/audio/` | Web Audio banjo synth (`AudioEngine` in `types.ts`) |
| `src/ui/instrument/` | Fretboard, ChordDiagram, dev Gallery at `#gallery` (props in `types.ts`) |
| `src/ui/controls/` | Explore controls: Toolbar, RootPicker, ChoiceChips/ChipSet, Segmented |
| `src/app/` | Shell, Explore (`views/explore/`), metronome dock (`views/Metronome.tsx`), settings |
| `src/styles/` | Design tokens and global CSS (spec in `docs/research/design.md`) |
| `content/shapes.ts` | Chord-shape library; Claude authors it |
| `docs/research/` | Clawhammer and design research the content and UI are built from |

Imports point downward only: domain ← theory ← audio / ui ← app. `content/` imports
only `src/domain` types.

## Explore links

Explore is the whole app (plus the metronome dock). Point the learner at it in chat:
`#/explore/chords/D7` (chord lab: major shapes up the neck and the one-note moves to any
quality), `#/explore/keys/G` (scale steps, I–vii° and diatonic 7ths), `#/explore/scales`.
Theory lives in `src/theory/voicings.ts`.

## Authoring conventions

- Strings are numbered 1 (high D) to 5 (short drone). Frets on strings 1–4 are relative to
  the capo; on string 5, 0 = open, otherwise the absolute neck fret (≥ 6).
- Note names are spelled by letter in context (`spellInChord`, `spellInScale`, `chordNotes`)
  and shown through `prettyNote` ("B♭m7♭5"); never respell a route's root to a plain name.
- Every shape in `content/shapes.ts` must pass `validateShape` (`content/content.test.ts`):
  strings 1–4 sound only chord tones, and all tones are present (5th optional).
- New chord qualities go in `CHORD_QUALITIES` and `CHORD_FORMULAS` (`src/theory/chords.ts`),
  plus a rule in `QUALITY_RULES` and a substitution path in `voicings.ts` if the lab should
  derive them.
