# Banjer design system

Status: decided. Tokens live in `src/styles/tokens.css`, base styles in `src/styles/global.css`.
This file is the spec component authors build against. Values are exact; when a number here
and a token disagree, the token wins and this file gets fixed.

## 0. Decisions at a glance

- **Direction:** luthier's bench, built from flat materials: no photographic wood, grain
  noise, or bevels. Warm paper (light) or walnut/ebony (dark) page; a dark rosewood
  fretboard in both themes; bone nut; nickel frets and strings; pearl inlays.
- **One UI accent: brass/amber `#e69f00`.** It always means *now*: the playhead, the
  current tab column, the primary button, the beat dot. It is also the melody role
  color, because the melody note is the thing you play now.
- **Role colors come from Okabe–Ito.** Each role also has its own shape:
  root ■ vermilion, chord ● sky, scale ○ verdigris ring, melody ◆ amber,
  thumb ▲ heather, muted × bone. Every marker also has a text label.
- **Focus is blue**, not amber, so a focus ring never reads as "this is playing".
- **No web font.** System sans for UI and numerals. A system old-style serif
  (Iowan/Palatino) for titles and reading text.
- **Glance size is 88 px at 1280 wide**, which is about 24 arcminutes of cap height at 2 m.
  Only the current step, the BPM, the marker shapes and colors, and the playhead need to
  be read from 2 m. Everything else is 1 m content.
- **Two-pedal grammar:** Forward = PageDown / → / ↓ / Enter, Back = PageUp / ← / ↑.
  Forward always moves the loop on. Back always means "again" or "change".

### Where I pushed back on the brief

1. **Material, not texture.** "Luthier's bench" is right for calm and warmth, but wood
   grain, sheen, and shadows are noise at 2 m. They also fight the markers. The board is a
   flat color with a single edge gradient.
2. **"One accent" covers the UI chrome, not the data.** Encoding note roles needs five
   categorical hues. I made the accent double as the melody role so the screen still
   reads as one warm accent plus a legend, and I kept focus blue on purpose.
3. **The board stays dark in light mode.** That is how the instrument looks, and it gives
   the markers the best stage. In dark mode the wood is only 1.23:1 against the page, so
   the ivoroid binding is **required**: it is the board's edge.
4. **"Melody/current note" mixes up role and state.** Melody is a role (◆ amber).
   *Current* is the `active` state, and any role can be active.
5. **Per-note glance text stops being readable above about 2.5 steps/s** (eighths above
   about 75 BPM). At that rate the glance line switches to the bar-level cue (see §8.3).
   The fretboard then carries the per-note information.
6. **A phone is not a 2 m device.** The 390 px layout assumes a music stand at 1 m or
   closer, and its glance size drops to 48 px.
7. **Space/Enter pedal mode is fragile** because Space activates whichever button has
   focus. Recommend the PageUp/PageDown mode, which every pedal researched offers.

---

## 1. Palette

### 1.1 Page and UI (theme-dependent)

| Token | Light (paper) | Dark (walnut) | Use |
| --- | --- | --- | --- |
| `--color-surface` | `#f3ece0` | `#1a1411` | page background |
| `--color-surface-sunken` | `#e9e0d1` | `#120e0c` | tab strip, wells, inputs |
| `--color-surface-raised` | `#fbf7f0` | `#241c17` | cards, transport bar, dialogs |
| `--color-ink` | `#2b2019` | `#eee5d6` | primary text |
| `--color-ink-muted` | `#66564a` | `#b9aa97` | secondary text |
| `--color-ink-subtle` | `#8a7a6c` | `#8d7e6e` | large text and icons only (≥3:1) |
| `--color-border` | `#d8cdbb` | `#3a2f27` | decorative dividers |
| `--color-border-strong` | `#8c7b6c` | `#7d6d5e` | control outlines, tab lines |
| `--color-accent` | `#e69f00` | `#e69f00` | accent fills |
| `--color-accent-strong` | `#8f5600` | `#f2b44c` | accent as text or line, playhead |
| `--color-accent-soft` | `#f5dfb8` | `#3b2a12` | current-step band, toggled-on fill |
| `--color-on-accent` | `#1f160f` | `#1f160f` | text on accent fill |
| `--color-loop-soft` | `#eadfc8` | `#2a221c` | loop band in tab |
| `--color-focus` | `#1f5fa8` | `#8cc4f2` | focus ring |
| `--color-status-clean` / `-soft` | `#1f6e4a` / `#dcebdf` | `#6cc59a` / `#17291f` | rating: clean |
| `--color-status-shaky` / `-soft` | `#7a5f00` / `#f1e6be` | `#d9c25a` / `#2c2610` | rating: shaky |
| `--color-status-lost` / `-soft` | `#a63a2a` / `#f5dcd3` | `#f08a70` / `#33191a` | rating: lost |

Light-mode note: `--color-accent` on paper is only 1.92:1, so the primary button
always carries a 1 px `--color-accent-strong` border. Its label (`--color-on-accent`,
7.90:1) identifies it.

### 1.2 Roles (fills are theme-independent; inks are not)

| Role | Fill token | Fill | Shape | Ink token (light / dark) | Pigment name |
| --- | --- | --- | --- | --- | --- |
| root | `--role-root` | `#d55e00` | rounded square | `#a04300` / `#e2701f` | vermilion |
| chord | `--role-chord` | `#56b4e9` | circle | `#1b6393` / `#56b4e9` | sky |
| scale | `--role-scale` | `#009e73` | ring (hollow) | `#006e53` / `#1fb38a` | verdigris |
| melody | `--role-melody` | `#e69f00` | diamond | `#8f5600` / `#e69f00` | amber |
| thumb | `--role-thumb` | `#cc79a7` | triangle (apex up) | `#9a4174` / `#cc79a7` | heather |
| muted | `--role-muted` | `#c9bfb1` | × cross | `#66564a` / `#b9aa97` | bone grey |

- Labels on every fill use `--role-on` `#1a120d`. Dark ink beats white on all five
  fills; the worst case, root, is 4.78:1.
- **Fills** are for the fretboard (always on wood) and for filled shapes anywhere.
  **Inks** are for strokes and text on page surfaces: hollow rings, open-string circles,
  ×, and legend text.
- On a page surface every filled marker gets a `--marker-outline` (= ink) edge 2 px
  wide. The sky and amber fills are below 3:1 on paper, so the outline provides the
  required non-text contrast (13.5:1).

**Colorblind check.** I simulated the fills with the Machado 2009 model at full severity
and measured CIEDE2000 distances. The closest pairs are deutan root/melody at 12.5,
protan chord/thumb at 14.0, and tritan melody/thumb at 10.9. Every pair is above 10, and
every pair also differs in shape, so no pair relies on hue. I chose Okabe–Ito over Tol
Bright and IBM because its orange and vermilion give two warm roles that stay separable
by lightness, and because it is the most widely used colorblind-safe set.

### 1.3 Fretboard materials (theme-independent)

| Token | Value | Material |
| --- | --- | --- |
| `--fb-wood` | `#3a2219` | rosewood fingerboard |
| `--fb-wood-edge` | `#2a1812` | edge shading, headstock stub, strike zone |
| `--fb-binding` | `#d7c9ac` | ivoroid binding, 2 px, top and bottom edges |
| `--fb-fret` / `--fb-fret-highlight` | `#b8b2a7` / `#e4dfd6` | nickel-silver wire |
| `--fb-nut` / `--fb-peg` | `#eae0cc` / `#eae0cc` | bone (nut and 5th-string pip / peg) |
| `--fb-peg-edge` | `#8a7a6a` | peg rim |
| `--fb-string` / `--fb-string-wound` | `#d4cec3` / `#b3a796` | plain steel / wound 4th |
| `--fb-string-active` | `#fff4dc` | sounding string |
| `--fb-inlay` | `#85796d` | pearl, kept quiet on purpose (3.48:1 landmark) |
| `--fb-capo` / `--fb-capo-edge` | `#4a4643` / `#d4cec3` | capo bar and outline |
| `--fb-spike` | `#b8b2a7` | railroad spike |
| `--fb-shade` | `rgb(18 10 7 / 0.6)` | frets behind capo or spike |
| `--fb-halo` | `#fff4dc` | active-marker ring |
| `--fb-ghost-ink` | `#efe3c8` | labels in rings and ghosts |
| `--fb-badge` / `--fb-badge-ink` | `#eee5d6` / `#1a120d` | finger badge, strike-zone glyphs |
| `--fb-marker-outline` | `#140c08` | 1.5 px edge on markers |
| `--fb-focus` | `#8cc4f2` | keyboard cursor on the board |

### 1.4 Contrast (WCAG 2.x relative luminance)

I computed these ratios from the values in `tokens.css` with the WCAG 2 relative-luminance
formula, after checking that the two dark blocks are identical. "Min" is the worst ratio across surface, raised, and
sunken. Text needs 4.5:1. Non-text needs 3:1 (focus rings, outlines, and marker edges,
under 1.4.11 and 2.4.13).

| Token | Light | Light min | Dark | Dark min | Need |
| --- | --- | ---: | --- | ---: | ---: |
| `--color-ink` | #2b2019 | 12.13 | #eee5d6 | 13.41 | 4.5 |
| `--color-ink-muted` | #66564a | 5.36 | #b9aa97 | 7.39 | 4.5 |
| `--color-ink-subtle` | #8a7a6c | 3.16 | #8d7e6e | 4.26 | 3 |
| `--color-border-strong` | #8c7b6c | 3.11 | #7d6d5e | 3.37 | 3 |
| `--color-accent-strong` | #8f5600 | 4.59 | #f2b44c | 9.10 | 4.5 |
| `--color-focus` | #1f5fa8 | 4.92 | #8cc4f2 | 9.01 | 3 |
| `--color-status-clean` | #1f6e4a | 4.74 | #6cc59a | 8.05 | 4.5 |
| `--color-status-shaky` | #7a5f00 | 4.63 | #d9c25a | 9.43 | 4.5 |
| `--color-status-lost` | #a63a2a | 4.92 | #f08a70 | 6.84 | 4.5 |
| `--role-root-ink` | #a04300 | 4.87 | #e2701f | 5.24 | 4.5 |
| `--role-chord-ink` | #1b6393 | 4.93 | #56b4e9 | 7.26 | 4.5 |
| `--role-scale-ink` | #006e53 | 4.78 | #1fb38a | 6.28 | 4.5 |
| `--role-melody-ink` | #8f5600 | 4.59 | #e69f00 | 7.44 | 4.5 |
| `--role-thumb-ink` | #9a4174 | 4.74 | #cc79a7 | 5.47 | 4.5 |
| `--role-muted-ink` | #66564a | 5.36 | #b9aa97 | 7.39 | 4.5 |

| Pair | Use | Light | Dark | Need |
| --- | --- | ---: | ---: | ---: |
| ink on accent-soft | tab digit in current band | 12.19 | 11.02 | 4.5 |
| ink-muted on accent-soft | secondary text in band | 5.39 | 6.07 | 4.5 |
| accent-strong on accent-soft | current digit, playhead in band | 4.61 | 7.48 | 4.5 |
| focus on accent-soft | focus ring over band | 4.95 | 7.40 | 3 |
| ink on loop-soft | digit in loop band | 12.01 | 12.51 | 4.5 |
| on-accent on accent | primary button label | 7.90 | 7.90 | 4.5 |
| status-clean on clean-soft | selected rating | 5.02 | 7.35 | 4.5 |
| status-shaky on shaky-soft | selected rating | 4.85 | 8.49 | 4.5 |
| status-lost on lost-soft | selected rating | 4.93 | 6.62 | 4.5 |
| marker-outline on surface | marker edge on page | 13.52 | 14.59 | 3 |
| fb-wood on surface | board vs page (info) | 12.57 | **1.23** | n/a |
| fb-binding on surface | board edge vs page | 1.39 | 11.14 | n/a |

The last two rows explain why the binding is mandatory in dark mode. In light mode, the
wood itself is the board's edge.

Fretboard pairs (same in both themes):

| Pair | Ratio | Need | | Pair | Ratio | Need |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| root fill / wood | 3.82 | 3 | | role-on / root | 4.78 | 4.5 |
| chord fill / wood | 6.40 | 3 | | role-on / chord | 8.01 | 4.5 |
| scale ring / wood | 4.31 | 3 | | role-on / scale | 5.40 | 4.5 |
| melody fill / wood | 6.55 | 3 | | role-on / melody | 8.21 | 4.5 |
| thumb fill / wood | 4.82 | 3 | | role-on / thumb | 6.04 | 4.5 |
| muted × / wood | 8.13 | 3 | | ghost-ink / wood | 11.59 | 4.5 |
| halo / wood | 13.51 | 3 | | badge-ink / badge | 14.80 | 4.5 |
| string / wood | 9.43 | 3 | | badge / wood | 11.82 | 3 |
| wound string / wood | 6.24 | 3 | | fret / wood | 7.00 | 3 |
| nut, peg / wood | 11.27 | 3 | | capo edge / wood | 9.43 | 3 |
| fb-focus / wood | 7.94 | 3 | | inlay / wood | 3.48 | 3 |

---

## 2. Typography

### 2.1 Stacks (no web font)

| Token | Stack | Used for |
| --- | --- | --- |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif` | UI, glance, numerals, tab, SVG text |
| `--font-serif` | `"Iowan Old Style", "Palatino Linotype", Palatino, "URW Palladio L", P052, "Book Antiqua", Georgia, serif` | `h1`–`h3`, item titles, read-item body |
| `--font-mono` | `ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace` | code only |

I am not adding a Google Fonts link. The serif stack is the modernfontstacks.com
"Old Style" stack plus Palatino and Georgia fallbacks. It gives the crafted feel on
macOS, Windows, and most Linux installs, and the app looks right offline and in a static
build. Glance text stays sans: large-x-height grotesques are more legible at distance than
old-style serifs.

**Numerals:** use `font-variant-numeric: tabular-nums` on BPM, timers, fret ruler, and
every SVG `<text>` (global.css sets this). Tab digits are positioned one per step, so
tabular figures only matter for the readouts. They stop BPM from jittering as it changes.

### 2.2 Scale

| Token | Size | Use |
| --- | --- | --- |
| `--font-size-xs` | 12 | metadata outside the practice view only |
| `--font-size-sm` | 14 | fret ruler, legend, kbd hints, cue syllables |
| `--font-size-md` | 16 | body at arm's length, open-string names |
| `--font-size-lg` | 20 | **minimum for any text in the practice view**; read-item body |
| `--font-size-xl` | 24 | header item title, chord name (md diagram) |
| `--font-size-2xl` | 32 | chord name (lg diagram), section titles |
| `--font-size-3xl` | 44 | count-in caption on phone |
| `--font-size-glance-next` | `clamp(1.5rem, 1rem + 1.75vw, 2.25rem)`: 24 → 36 | "Next" line |
| `--font-size-glance` | `clamp(3rem, 1.5rem + 5vw, 6rem)`: 48 → 96, **88 at 1280** | current step, BPM, count-in |

Weights: 400 / 500 / 600 / 700. Glance and BPM use 700, `--leading-none`, and
`--tracking-glance` (−0.015em). Headings use 600 serif with `--leading-snug`. Body text
uses `--leading-normal` (1.5). Small caps eyebrows ("NEXT", "TEMPO") use the `sm` size,
700 weight, uppercase, and `--tracking-caps`.

**Why 88 px.** A 13.3″ 16:10 panel at 1280 CSS px wide is about 0.224 mm/px. With a cap
height of about 0.70 em, 88 px gives a 13.8 mm cap, which is 23.7′ of arc at 2 m. That
is about 4.7× the 5′ 20/20 threshold, so it is comfortable. For comparison:

- 36 px Next line: 9.7′ at 2 m. Readable but quiet, which is the intent.
- 22 px marker labels: 5.9′ at 2 m, which is threshold. They are 1 m content.

The 2 m channel is shape, color, glance text, BPM, and playhead.

---

## 3. Space, radius, elevation, motion

- **Space** (4 px base): `--space-1..8` = 4, 8, 12, 16, 24, 32, 48, 64.
  - Page gutter: `--layout-gutter`, 24 px, or 16 px under 600 px.
  - Gap between practice regions: 8 px.
  - Component padding: 12–16 px.
- **Hit targets:** `--hit-target` is 44 px. Transport and rating buttons use
  `--hit-target-practice`, 48 px.
- **Radius:**
  - `--radius-xs` 2 px: tab digit knockouts.
  - `--radius-sm` 4 px: kbd, current band.
  - `--radius-md` 6 px: buttons, tab strip.
  - `--radius-lg` 10 px: cards and dialogs.
  - `--radius-pill`: beat dots, toggles.
  - Crafted means modest radii, not pills everywhere.
- **Elevation:** the UI is flat by default. Use surfaces and 1 px borders before shadows.
  - `--shadow-1`: raised cards and the transport bar.
  - `--shadow-2`: menus and popovers.
  - `--shadow-3`: dialogs (shortcut sheet).
  - `--fb-shadow`: under the fretboard only.
  - In dark mode, shadows turn to black at higher alpha. Raised surfaces are lighter
    (`#241c17`), so elevation reads through color.
- **Motion. Motion only shows time passing.**

  | What | Duration / easing | Reduced motion |
  | --- | --- | --- |
  | Playhead travel | per frame from the `AudioContext` clock, linear | snaps to each step's x |
  | Sounding-string glow | opacity 1 → 0.35 over the step's duration | on for the step, then off |
  | Strike-zone glyph | appears at onset, fades over the step (min 150 ms) | on for the step, then off |
  | Active marker | halo appears at onset (no fade-in; it must be on time) | same |
  | Count-in number | scale 1 → 1.06 → 1, `--duration-fast`, `--ease-standard` | number swaps, no scale |
  | Beat dot | fill swap at the beat; no transition | same |
  | Tab page-turn | `translateX`, `--duration-slow` (320 ms), `--ease-standard` | instant |
  | Hover / press / toggle colour | `--duration-fast` (120 ms) | instant |
  | Rating prompt, menus | opacity only, `--duration-base` (200 ms), `--ease-enter` | instant |

  Never use slides, springs, bounces, confetti, or streak animations.

  - **CSS transitions:** under `prefers-reduced-motion: reduce`, tokens.css sets all
    `--duration-*` to 0 ms, and global.css clamps every transition and animation to
    0.01 ms.
  - **JS-driven motion** (playhead, glow) must read
    `matchMedia('(prefers-reduced-motion: reduce)')` and listen for `change`.

---

## 4. Fretboard rendering spec

### 4.1 Frame

- **Orientation:** horizontal, nut on the left, **string 1 on top and string 5 at the
  bottom**, exactly matching the tab strip below it. This is the mirror of the player's
  downward view. Matching tab is more important.
- **Left-handed:** mirror every x coordinate (nut on the right, strike zone on the left).
  Text is never mirrored, and string order is unchanged.
- **Design viewBox:**
  - Desktop (≥ 600 px): `0 0 1200 300`, string gap `s = 52`.
  - Compact (< 600 px): `0 0 400 230`, `s = 40`.
  - Render with `width: 100%; height: 100%`, `preserveAspectRatio="xMidYMid meet"`.

Horizontal zones (desktop / compact, user units):

| Zone | Desktop x | Compact x | Notes |
| --- | --- | --- | --- |
| Open-string names (gutter) | 0–44 | 0–28 | page surface |
| Headstock stub / open lane | 44–92 | 28–60 | `--fb-wood-edge`; open markers centred at 68 / 44 |
| Nut | 92–102 | 60–66 | `--fb-nut` |
| Fingerboard (`X0`–`X1`) | 102–1104 | 66–352 | `--fb-wood` |
| Break | 1104–1116 | 352–360 | page shows through; both edges cut at a 12° slant |
| Strike zone | 1116–1188 | 360–396 | `--fb-wood-edge`; right-hand glyphs |

Vertical layout: the fret ruler sits at y 0–24 (desktop) or 0–18 (compact). The board
starts below it, and string `i` is at `y = boardTop + s/2 + (i − 1)·s`.

| | Desktop | Compact |
| --- | --- | --- |
| Board top | 24 | 18 |
| Board bottom | 284 | 218 |
| String y (1→5) | 50, 102, 154, 206, 258 | 38, 78, 118, 158, 198 |

Below the board there is a 16 px (desktop) / 12 px (compact) band where the 5th-string
peg protrudes. The board fill has a vertical gradient: `--fb-wood-edge` → `--fb-wood`
(over 12%) → `--fb-wood` → `--fb-wood-edge` (last 12%). Use no other texture.

### 4.2 Fret spacing (equal temperament)

Use `f(n) = 1 − 2^(−n/12)`. For a window of absolute frets `[a, b]`:

```
x(n) = X0 + (X1 − X0) · (f(n) − f(a)) / (f(b) − f(a))
cell centre cx(n) = (x(n−1) + x(n)) / 2        // fret n ≥ 1
```

- **Default windows:**
  - Desktop `[0, 12]`: cell 1 is 112.5 units wide, cell 12 is 59.6.
  - Compact `[0, 7]`: cell 1 is 48.3, cell 7 is 34.1.
  - The app shifts the window to include every marker plus one fret of margin, keeping at
    least five frets.
- **Full neck `[0, 22]`:** cell 22 is 23 units wide. When any visible cell is narrower
  than the marker diameter `d`, set `d = max(0.5·s, 0.92 · narrowest cell)` for the whole
  view.
- **When `a > 0`:**
  - Drop the gutter's open lane and the nut.
  - The board starts at `x = 52` with a slanted break edge.
  - The ruler shows the window's first fret number.

### 4.3 Parts (drawn bottom to top)

1. **Board and headstock stub.** Draw the fills, then the 2 px `--fb-binding` lines on
   the board's top and bottom edges (nut to break, and across the strike zone).
2. **Inlays:** pearl dots, `--fb-inlay`, radius `0.16·s` (8.3).
   - **Single** at 3, 5, 7, 10, 15, 17, 19, 22, centered at `(cx(n), y of string 3)`, the
     board's center line.
   - **Double** at 12, at `y = boardTop + s` and `boardTop + 4·s` (midway between strings
     1–2 and 4–5).
   - Inlays sit under the strings. They never carry labels or outlines, so they cannot be
     mistaken for markers.
3. **Frets:** 3 px `--fb-fret` lines at `x(n)`, from `boardTop + 1` to `boardBottom − 1`,
   with a 1 px `--fb-fret-highlight` on the left edge.
4. **Nut:** a 10 px `--fb-nut` rect, full board height. There is no nut when `a > 0`.
5. **Fifth string (pip and peg):**
   - **Pip** (its nut): 8 × 12 rect, rx 2, `--fb-nut`, centred on `(x(5), y5)`.
   - **Peg:** circle r `0.26·s` (13.5), `--fb-peg` fill, 1.5 px `--fb-peg-edge`.
     - Center at `(x(5) − 0.45·cell(5), boardBottom + 2)`, so it protrudes below the board
       on the bass side, as on the instrument.
     - Draw a 2.25 px string segment from the peg center to the pip.
   - **String 5** runs from the pip to the strike zone. There is no string left of the pip.
6. **Strings:** lines from the gutter edge (x 44; compact 28) to the strike zone end
   (x 1188; compact 396), broken by the break gap.

   | | Str 1 | Str 2 | Str 3 | Str 4 | Str 5 |
   | --- | --- | --- | --- | --- | --- |
   | Gauge | .010 | .012 | .016 | .022w | .010 |
   | Width | 2.25 | 2.5 | 2.75 | 3.5 | 2.25 |
   | Token | `--fb-string` | `--fb-string` | `--fb-string` | `--fb-string-wound` | `--fb-string` |

   - Width tokens are `--fb-string-N-width`.
   - A muted string (role `muted`) is drawn at 35% opacity.
7. **Capo** (`setup.capo = c > 0`), covering strings 1–4 only:
   - **Bar:** 12 wide, rx 6, centred at `x(c) − 0.3·cell(c)`. It runs from
     `boardTop − 6` (poking into the ruler) to `y4 + s/2` and stops above string 5.
     Fill `--fb-capo`, 2 px `--fb-capo-edge`.
   - **Shade:** a `--fb-shade` rect covers frets behind the capo, from x 44 to the bar's
     left edge, on rows 1–4.
   - **Open markers** for strings 1–4 move onto the bar's center line.
8. **5th-string spike** (`fifthRaise = r > 0`, default `capo`), at absolute fret
   `k = 5 + r`:
   - **Spike:** a 7 × 7 rect, rx 2, `--fb-spike`, with a 1 px `--fb-marker-outline` edge,
     at `(x(k) − 0.25·cell(k), y5 + 0.2·s)`. Add a 1.5 px stem up to the string.
   - **Shade:** row 5 from the pip to the spike, height `0.8·s`.
   - **Open 5th-string marker** moves to `cx(k)`.
   - The board draws a raise as a spike even if the player retunes instead. The sounding
     result is the same, and the header text says which.
9. **Sounding-string glow** (see §3), drawn over the string from the active marker's x
   to the strike zone end, at width +1, in `--fb-string-active`.
10. **Markers** (§5), drawn in z order: dim, rest, next, active.
11. **Finger badges, then strike-zone glyphs, then the keyboard cursor.**

### 4.4 Open strings and labels

- **Open-string names** sit in the gutter, centered at x 22 (compact: 14), on each
  string's y. Style: `--font-size-md`, 600, `--color-ink-muted`.
  - They show the **sounding** open pitch, including the capo and the 5th-string raise:
    open G with capo 2 reads `A E A C♯ E` from string 1 to string 4, and `a` on string 5.
  - String 5 is lowercase, matching the `gDGBD` convention.
  - `showOpenNames = false` removes the names and narrows the gutter to 12.
- **Open markers:**
  - **Strings 1–4:** in the open lane, x 68 (behind the nut), or on the capo bar.
  - **String 5:** centered at `cx(5)`, in the empty cell left of its pip ("behind its
    nut"), or at `cx(k)` when spiked.
- **Fret ruler:**
  - Absolute fret numbers at `cx(n)` for the inlay frets in the window, plus the window
    start when `a > 0`.
  - Style: `--font-size-sm`, 600, `--color-ink-muted`, baseline y 17.
  - The numbers are absolute even with a capo, because the board is physical. Tab
    numbers stay capo-relative, and the glance line quotes tab numbers.
- **Setup text** ("Open G · capo 2 · 5th spiked at 7") lives in the header, not on the
  board.
- **Legend:** an HTML overlay at the top-right of the ruler band. It lists only the roles
  present, as a 14 px shape swatch plus the role name (`sm`, ink-muted). It is
  `aria-hidden`, because the SVG label already names the roles.

### 4.5 Strike zone (right hand)

This is the right-hand area. The left hand lives on the board and the right hand lives
here. Glyphs are centered at x 1152 (compact: 378), use `--fb-badge`, and appear only
for the `active` step:

| Stroke | Glyph on the struck string(s) |
| --- | --- |
| strike | filled circle, r `0.2·s` |
| brush | rounded bar `0.22·s` wide, from top brushed string − `0.2·s` to bottom brushed string + `0.2·s` |
| thumb | "T", sans 700, `0.5·s` |
| drop-thumb | `0.56·s` rounded square (rx 4) in `--fb-badge`, with "T" in `--fb-badge-ink` |

These glyphs are deliberately non-directional. A down-stroke travels from string 5
toward string 1, which is *upward* in tab orientation, so an arrow would lie.

---

## 5. Note markers

### 5.1 Geometry and roles

The base diameter is `d = 0.76·s`: 39.5 desktop, 30.4 compact. Markers are centered at
`cx(n)` on the string line. Shape areas are roughly equalized.

| Role | Shape | Size | Fill | Edge | Label |
| --- | --- | --- | --- | --- | --- |
| root | rounded square, rx = 0.16·side | side 0.9·d | `--role-root` | 1.5 `--fb-marker-outline` | `--role-on` |
| chord | circle | Ø d | `--role-chord` | 1.5 outline | `--role-on` |
| scale | ring, stroke 0.1·d | Ø 0.9·d | `--fb-wood` (masks the string) | ring in `--role-scale` | `--fb-ghost-ink` |
| melody | diamond (square at 45°, corner r 0.06·d) | diagonal 1.2·d | `--role-melody` | 1.5 outline | `--role-on` |
| thumb | equilateral triangle, apex up | side 1.2·d; label at centroid + 0.06·d down, 0.42·d font | `--role-thumb` | 1.5 outline | `--role-on` |
| muted | × with round caps; a 1.5 px wider × in `--fb-marker-outline` behind it | arms 0.56·d, stroke 0.12·d | none | none | none: the × is the label |

**Labels:**

- Font: sans 700, size `0.5·d`, or `0.42·d` for two characters, tabular. At most two
  characters (`FretMarker.label`).
- **Defaults chosen by the app:**
  - Shape and scale items: intervals (`R`, `3`, `5`, `♭7`).
  - Sequences: note names.
  - `N` cycles interval → note → finger.
- With interval labels, the label itself repeats the role. With note names, the shape
  carries the role. Either way, color is never alone.
- **Accessible names always include the role word,** e.g. "Root G, string 3 open". Spell
  accidentals out ("B flat") in ARIA text.

**Role usage rule:** `thumb` is for string-5 notes played with stroke `thumb`. A
drop-thumb on an inner string is a `melody` note with stroke `drop-thumb`. The strike
zone shows the boxed T.

### 5.2 States

| State | Scale | Fill | Edge | Label | Extras |
| --- | --- | --- | --- | --- | --- |
| rest (undefined) | 1 | role fill | outline | shown | finger badge |
| **active** (sounding) | `--marker-active-scale` 1.12 | role fill (a scale ring fills solid with `--role-scale`) | outline + 3 px `--fb-halo` ring at radius + 4.5 | 700 | finger badge, string glow, strike-zone glyph |
| **next** (ghost) | 1 | none (wood mask) | 2.5 px role colour, dash `5 4` | `--fb-ghost-ink`, 600 | finger badge |
| **dim** (context) | `--marker-dim-scale` 0.86 | role fill | outline | hidden | group opacity `--marker-dim-opacity` 0.4 |

Active is the only state with a halo. That halo, plus size, is what you see at 2 m. Next
never fills, so active and next can never be confused, even in grayscale.

### 5.3 Finger and stroke

- **Left-hand finger** (`FretMarker.finger`):
  - Shape: a badge circle, r `0.26·d`, centered at `(cx + 0.42·d, cy − 0.42·d)` (top
    right).
  - Style: `--fb-badge` fill, 1 px `--fb-marker-outline`, digit sans 700 at `0.34·d` in
    `--fb-badge-ink`. `T` for thumb.
  - Shown on rest, active, and next. Hidden on dim.
  - Convention: 1 index, 2 middle, 3 ring, 4 pinky, T thumb (Fender, JustinGuitar).
- **Right-hand stroke** (`FretMarker.stroke`):
  - Shown in the strike zone (§4.5) for the active step only, never on the marker.
  - The same four glyphs appear in the tab stroke lane (§7) and in the glance line (§8.3),
    so the learner learns one symbol set.

---

## 6. Chord diagram (vertical box)

`<figure>` holds `<figcaption>` (the chord name) and the `<svg>`. The design viewBox is
`0 0 120 150`; `size` sets the CSS width.

| `size` | Width | Name style | Interval row |
| --- | --- | --- | --- |
| sm (queue thumbnails) | 72 px | `md` 700 | no |
| md (practice glance row) | 112 px | `xl` 700 | no |
| lg (shape items) | 200 px | `2xl` 700 | yes |

**Geometry:**

- **Strings:** 4 → 1, left to right, at x 38, 60, 82, 104 (gap 22). Lines are 1.5
  `--color-border-strong`.
  - The 5th string gets an **indicator slot** at x 16, in the top row only, with no line.
  - If string 5 is fretted (≥ 6), a caption below the grid reads "5th: 7" (`sm`,
    ink-muted).
- **Indicator row**, y 12:
  - Open root: hollow rounded square, 11 × 11.
  - Open chord tone: hollow circle, r 6.
  - Not played: ×, arms 10.
  - Lines are 2 px in the matching `--role-*-ink`. The × uses `--role-muted-ink`.
- **Nut and position:**
  - When the window starts at fret 1, the nut is a 5 px `--color-ink` bar at y 24.
  - Otherwise use a 1.5 px line, with a position label (`5fr`, `sm` 600 ink-muted)
    right-aligned in the 5th-slot column on the first fret row.
- **Frets:** 4 spaces (5 if the shape needs it) with **uniform** 26-unit spacing, lines
  1.5 `--color-border-strong`. Physical spacing belongs to the fretboard only. Box
  diagrams are conventionally uniform.
- **Dots:** Ø 18 (side 16 for a root square). Role shapes and fills as on the board, with
  a 2 px `--marker-outline` edge.
  - The label is the finger number (`showFingers`, default true), sans 700, 11 units, in
    `--role-on`.
- **Barre:** a capsule 18 high (rx 9) from string `from` to string `to` at the fret,
  `--role-chord` fill, 2 px outline, with the finger number shown once in the middle.
- **Interval row** (lg only): y 146, the interval under each string, `sm`, ink-muted.

**Emphasis:**

- **current:** the name turns `--color-accent-strong` with a 2 px accent-strong underline.
  The grid is unchanged.
- **next:** a small-caps "NEXT" eyebrow appears, the name uses ink-muted, and the dots
  render as dashed hollow ghosts in their `--role-*-ink`.
- **none:** plain.

**ARIA:** the svg gets `role="img"` and an `aria-label` such as "G major. Strings 4 to 1
open; 5th string open. Root on string 3." The figcaption stays visible.

---

## 7. Banjo tab

**Staff and spacing:**

- **Staff:** 5 lines, string 1 on top.
  - Gap `--tab-line-gap`: 28 px desktop, 22 px compact.
  - Lines are `--tab-line-width` (1.5) in `--color-border-strong` (3.1:1 or better).
  - The strip background is `--color-surface-sunken`, `--radius-md`.
- **Vertical bands (desktop, about 196 px total):**
  - Chord/bar row: 20
  - Staff: 112, plus 11 of digit overflow at top and bottom
  - Stroke lane: 24
  - Cue row: 18
- **Horizontal spacing:** each step advances
  `max(--tab-min-step-width, ticks/480 · --tab-quarter-width)`. Defaults: 28 px minimum,
  64 px per quarter on desktop; 22 and 52 on compact. Bars get 16 px of padding after a
  barline and 12 px before the next one.

**Notes and strokes:**

- **Digits:** `--tab-font-size` (22 desktop, 17 compact), sans 600, `--color-ink`,
  centered on the line.
  - Each digit sits on a knockout rect (rx 2, padding 3 px horizontal) filled with the
    strip background, or with the band color when the step is inside a band.
  - A muted note is written "x".
- **Brush:** the digits stack on the brushed strings. A 2 px `--color-ink-muted` bracket
  sits 14 px left of the column, spanning top brushed string − 6 to bottom + 6, with
  4 px serifs.
- **Stroke lane** (one glyph per step, `--color-ink`, centered under the step):

  | Stroke | Lane glyph |
  | --- | --- |
  | strike | filled circle, r 4.5 |
  | brush | rounded bar, 5 × 16 |
  | thumb | "T", sans 700, 0.75 × tab size |
  | drop-thumb | 16 × 16 rounded square (rx 3) filled ink, "T" in `--color-surface` |

  Steps sounded by an articulation have no lane glyph. A bum-ditty bar reads
  `●  ▮  T   ●  ▮  T`, and the pattern is learnable as a picture.
- **Articulations** connect from the previous note on the same string:
  - **hammer-on / pull-off:** an arc from the top edge of the previous digit to the top
    edge of this one, apex 10 above, 1.5 px `--color-ink-muted`. Put "h" or "p"
    (`sm` 600, ink-muted) above the apex. On string 1 it goes into the chord/bar row.
  - **slide:** a straight 1.5 px line between the digits' facing edges, rising ±6 when
    the pitch rises and falling when it falls. No letter.
  - **lh-pluck:** "+" (`sm` 700, ink) above the digit.
- **Cues** (`Step.cue`): bum, dit, ty, 1, &. `sm`, `--color-ink-muted`, centered under
  the lane. `showCues = false` removes the row.

**Bars and chords:**

- **Bar lines:** 1.5 px `--color-ink-muted` from string 1 to string 5.
  - Final barline: a thin line and a 4 px thick line, 3 apart.
  - Repeat (whole-sequence loop): thick-thin with two r 2.5 dots between strings 2–3 and
    3–4.
- **Chords** (`Step.chord`): in the top row at the step's x, `md` 700 ink. Bar numbers
  (`sm` ink-subtle) sit at the barline's top end only when the sequence has more than 4
  bars. When the two collide, the chord wins.

**Playback:**

- **Playhead:** a 3 px vertical rule in `--color-accent-strong`, running from 16 above
  string 1 to the bottom of the stroke lane. It has a 10 × 7 downward triangle cap.
  - Its x is interpolated between step onsets from the audio clock.
  - Under reduced motion it snaps to the current step.
- **Current step:** a `--color-accent-soft` band (rx 4) behind the active column, from
  14 above string 1 to the stroke lane's bottom. Digits inside it turn
  `--color-accent-strong` at 700. There is no layout shift. The next step gets no band;
  it is previewed on the board and in the glance line.
- **Loop region:** a `--color-loop-soft` band behind the looped bars.
  - Each end gets a 2 px accent-strong bracket in the top row, with a 6 px inward flag.
  - When the loop is the whole sequence, draw repeat barlines instead of the band.
- **Following:** the strip shows as many whole bars as fit.
  - When the playhead enters the last visible bar, the strip pages forward so that bar
    becomes the first one (1-bar overlap). This uses a `--duration-slow` translate, or is
    instant under reduced motion.
  - On loop wrap it jumps back instantly.
  - I chose this over continuous scrolling because moving text cannot be read at 2 m.

---

## 8. Practice screen

### 8.1 Desktop, 1280 × 800

```
y=0   ┌──────────────────────────────────────────────────────────────────────────────┐
      │ Banjer   3 / 7  Bum-ditty on G (serif)      Open G · no capo      ◐  ?  Full │ 48  header
48    ├──────────────────────────────────────────────────────────────────────────────┤
      │ ● Strike ③ open                     │   G   (xl)   │  [−]   84   [+]          │
      │   (glance 88/700)                   │  ○ ○ ○ ○     │       (glance)          │ 144 glance row
      │ NEXT  ▮ Brush ①–③   (glance-next)   │  ╤╤╤╤ md box │  BPM → 100   ● ○ ○ ○    │
      ├─────────────────────────────────────┴──────────────┴─────────────────────────┤
      │     3     5     7        10      12              ◆ melody ▲ thumb (legend)   │
      │ D ▐║───┼─────┼─────┼─────┼──────┼─────┼─────┼────┼────┼────┼───┼───  ╱ ╱ ●  │
      │ B ▐║   │     │  •  │     │      │  ◆  │          │                   ╱ ╱    │ ≈300 fretboard
      │ G ▐║   │     │     │     │      │     │          :                   ╱ ╱    │ (fills rest)
      │ D ▐║   │     │     │     │      │     │          │                   ╱ ╱    │
      │ g         ◯peg ▕──┼─────┼──────┼─────┼─────┼────┼────┼────┼───┼───  ╱ ╱ T  │
      ├──────────────────────────────────────────────────────────────────────────────┤
      │  G                                     (tab on surface-sunken)               │
      │ ║─[0]───────────────0────────│──0──────────────0───────────│                 │
      │ ║─────────0───────────────── │ ──────0──────────────────── │                 │ 196 tab
      │ ║─────────0───────────────── │ ──────0──────────────────── │                 │
      │ ║─────────────────────────── │ ─────────────────────────── │                 │
      │ ║───────────────0─────────── │ ────────────0────────────── │                 │
      │   ●       ▮     T              ●     ▮      T                                │
      │  bum     dit    ty            bum   dit     ty                               │
      ├──────────────────────────────────────────────────────────────────────────────┤
      │ [▶ Play ␣] [↺]  │ [Loop L] [Count C] [Click M] [Demo D] │ [✓ Clean 1] [∼ Shaky 2] [✗ Lost 3] │ 72
800   └──────────────────────────────────────────────────────────────────────────────┘
```

**Grid:**

- `grid-template-rows: 48px 144px minmax(240px, 1fr) 196px 72px`, gutters 24 px, gaps 8.
- **Glance row columns:** `1fr 140px 280px`.
  - The **Now** cell is left-aligned. The glance line sits on the baseline grid. The Next
    line is 8 below.
  - **BPM** has the −/+ buttons (48 × 48) flanking the number. Under it: "BPM", the target
    ("→ 100", `sm` ink-muted), and the beat dots. Beat dots are 14 px with a gap of 8; the
    downbeat is 18 px. The current beat is filled `--color-accent`; the others are hollow
    with a 2 px `--color-border-strong` edge.
- **Transport** (`--color-surface-raised`, top border `--color-border`, `--shadow-1`):
  - Buttons are 48 tall, `--radius-md`, label `md` 600, with a `kbd` hint inside.
  - Play is the only accent-filled button.
  - Toggles show their on state three ways: `--color-accent-soft` fill, a 2 px
    accent-strong bottom bar, and a filled icon (outline when off), plus `aria-pressed`.
  - Rating buttons are neutral, with the icon drawn in the status color. They light up
    with a status-soft fill and a 2 px status border when highlighted or chosen.
- **Fullscreen** (`F`) gives the full 800. In a normal window (about 1280 × 720) only the
  fretboard row shrinks.

### 8.2 Phone, 390 wide (music stand at ≤ 1 m)

```
┌──────────────────────────────────────┐
│ ≡  3/7 Bum-ditty on G        ◐   ?   │ 44 header
├──────────────────────────────────────┤
│ ● Strike ③ open        (glance 48)   │
│ NEXT ▮ Brush ①–③       (next 24)     │ ≈104
├──────────────────────────────────────┤
│ D ║──┼───┼───┼──◆┼───┼───┼───┼ ╱ ●   │
│ B ║  │   │   │   │   │   │   │ ╱     │ ≈206 fretboard [0,7], s=40
│ …                                    │
│ g        ◯ ▕──┼───┼───┼───┼─ ╱ T     │
├──────────────────────────────────────┤
│  G  ┌┬┬┬┐ md     │   [−]  84  [+]    │ ≈128 chord + tempo
│     ├┼┼┼┤        │   → 100  ● ○ ○ ○  │
├──────────────────────────────────────┤
│ tab, 2 bars visible, pages           │ ≈150
├──────────────────────────────────────┤ sticky bottom, + safe-area-inset
│ [▶ Play]   [↺]   [Loop]   [⋯ More]   │ 56
│ [✓ Clean]  [∼ Shaky]  [✗ Lost]       │ 56
└──────────────────────────────────────┘
```

**More** opens a sheet with Count-in, Metronome, Demo, and Labels. The page may scroll
under the sticky transport.

### 8.3 Glance line content

- **Format:** stroke glyph + stroke word + circled string number + fret, using the tab
  number (`open` for 0). Examples:
  - `● Strike ③ open`
  - `▮ Brush ①–③`
  - `T Thumb ⑤`
  - `▣ Drop-thumb ② 2`
- **Articulations** append a suffix at the Next size: `→ h 2`.
- **Circled numbers** are drawn as inline SVG (a 0.8 em circle with a 2 px ink stroke
  and a 0.55 em digit), not U+2460 glyphs.
- **Count-in:** the glance line shows the count number in `--color-accent-strong`, and
  the Next line shows "Count-in".
- **Fast steps:** above 2.5 steps/s, the glance line shows the bar-level cue: chord plus
  cue pattern, e.g. `G · bum-dit-ty`. It updates per bar.
- **Other item kinds:**
  - **shape:** no tab row. Up to four lg chord diagrams take its place. The glance line
    is the chord name.
  - **scale:** the glance line reads "G major pentatonic". The tab row shows `run` if
    present.
  - **read:** a single column, max 68ch, serif `lg` body, with a "Continue ▸" button
    (Forward).

---

## 9. Keyboard and pedal map

Pedals researched:

- PageFlip Cicada and Firefly offer five modes: PgUp/PgDn, ←/→, ↑/↓, mouse, Space/Enter.
- PageFlip Butterfly offers three: PgUp/PgDn, ↑/↓, ←/→.
- AirTurn BT200 mode 3 and the PED/PEDpro modes send PgUp/PgDn or arrows.

So **every** arrow and page key is a pedal key. That rules out arrows for scrubbing or
tempo, and it is why there is no `role="toolbar"` or `radiogroup` in the practice view:
those would capture arrows.

### 9.1 Two-pedal grammar (`event.key`)

**Forward** = `PageDown`, `ArrowRight`, `ArrowDown`, `Enter`.
**Back** = `PageUp`, `ArrowLeft`, `ArrowUp`.

| State | Forward | Back | Space |
| --- | --- | --- | --- |
| Ready (item shown: *see it*) | Play along: count-in, then loop | Hear it: demo once, no count-in | Play along |
| Hearing (demo) | Stop → Ready | Restart demo | Stop → Ready |
| Count-in / Playing | Stop → Rate | Restart from bar 1 with count-in | Stop → Rate |
| Rate (prompt open, nothing chosen) | ignored, hint "◀ choose" | Highlight Clean | Highlight Clean |
| Rate (one highlighted) | **Save** the highlighted rating → Rated | Highlight next: Clean → Shaky → Lost → Clean | same as Back |
| Rated ("Logged Shaky at 84 · next tempo 84") | Next item → Ready | Again: same item at the new tempo, starts count-in | Again |
| Read item | Next item | Previous item | Next item |

- Rating has no default selection, which keeps the feedback honest.
- A pedal-only loop is: Forward (play), Forward (stop), Back ×n (choose), Forward
  (save), then Forward (next) or Back (again).

### 9.2 Full keyboard

| Key | Action |
| --- | --- |
| `Space` | Play / stop (per table above) |
| `Enter` | Forward |
| `PageDown` `→` `↓` / `PageUp` `←` `↑` | Forward / Back |
| `1` `2` `3` | Rate Clean / Shaky / Lost and save immediately (from Playing or Rate → Rated) |
| `-` / `=` (also `_` `+`, numpad) | Tempo −/+ `tempo.step` (default 4); with Shift, ±1 |
| `L` | Loop on/off |
| `C` | Count-in on/off |
| `M` | Metronome click on/off |
| `D` | Demo sound on/off (hear the line while playing along) |
| `,` / `.` | Step back / forward one step while stopped; announces the step |
| `Home` | Back to bar 1 |
| `[` / `]` | Previous / next item (no rating logged) |
| `N` | Cycle marker labels: interval → note → finger |
| `F` | Fullscreen |
| `?` | Shortcut sheet (dialog) |
| `Esc` | Close dialog. Otherwise: Playing → Ready (no prompt); Rate → Ready (nothing logged) |

**Handler rules:**

- Use one `keydown` listener on `window` while the practice view is mounted.
- Ignore events with Ctrl, Meta, or Alt held. Never steal browser shortcuts.
- Ignore events whose target is `input`, `textarea`, `select`, or `[contenteditable]`.
- **Space and Enter** are handled globally only when the target is `body` or the
  practice `<main>`. On a focused button they activate the button natively.
- **Page and arrow keys** are always handled, with `preventDefault` to stop scrolling.
- Ignore `event.repeat` for every state-changing key. Allow it for tempo.
- Ignore a second Forward/Back within 150 ms (pedal bounce).
- Letter keys are matched case-insensitively on `event.key`.
- On item load and after a pointer click on a transport control, return focus to
  `<main id="practice" tabindex="-1">`. Space/Enter pedals then keep working.
- **Pedal setup copy** (shortcut sheet): "Set your pedal to PageUp/PageDown or arrow
  mode."

---

## 10. Focus and ARIA

**Focus:**

- **Ring:** `outline: var(--focus-width) solid var(--color-focus); outline-offset:
  var(--focus-offset)` (3 px, 2 px gap). It is applied on `:focus-visible` only; global.css
  does this.
  - The ring is 4.9:1 or better on every light surface and 9.0:1 or better on every dark
    one.
  - The 2 px offset keeps the ring on the page around accent-filled buttons.
- **Exceptions:** programmatically focused containers (`main`, `section`, `article`,
  region, dialog with `tabindex="-1"`) get no ring. Never remove a ring anywhere else
  without drawing a replacement.
- **Inside SVG:** an interactive fretboard (explorer only; the practice view never passes
  `onSelect`) is one tab stop: `tabindex="0"`, `role="group"`,
  `aria-roledescription="fretboard"`.
  - Arrows move a cursor: ↑/↓ change string, ←/→ change fret.
  - The cursor is a 3 px `--fb-focus` ring at the marker radius + 6.
  - Enter/Space call `onSelect`. The live region speaks "String 3, fret 2, A".

**Structure:**

- `<header>` contains the item title as `h1` (serif).
- `<main id="practice" tabindex="-1" aria-labelledby="item-title">`.
- The transport is `<div role="group" aria-label="Transport">`. Not `toolbar`, because
  toolbars own arrow keys.
- **Play** is a button whose name changes "Play" ↔ "Stop". Do not also set
  `aria-pressed`.
- **Loop, Count-in, Metronome, and Demo** are `<button aria-pressed>`.
- Every button with a shortcut sets `aria-keyshortcuts` (`"Space"`, `"L"`, `"1"` …) and
  shows a `<kbd>` hint.
- **Tempo:** `role="group" aria-label="Tempo"`.
  - Buttons named "Slower" and "Faster".
  - The value is `<output>` with visible "84" and a visually hidden "BPM, target 100".
- **Rating:** `role="group" aria-label="Rate this attempt"` with three buttons, "Clean",
  "Shaky", "Lost".
  - Each has an inline SVG icon (check, wave, cross), never color alone.
  - The pedal highlight sets `aria-pressed="true"` on one button. Saving logs it.

**Instrument views:**

- **Fretboard:** `role="img"`, `aria-label={label}`, plus a `<title>`. The label names
  the roles shown ("G major scale, frets 0 to 7; roots marked").
- **Tab:** `role="img"` with a label ("Bum-ditty on open G, 4 bars").
  - Step clicks (`onSelectStep`) are a pointer convenience. `,` and `.` are the keyboard
    equivalent.
- **Chord diagram:** see §6.

**Live region:** exactly one `<p role="status" aria-live="polite" aria-atomic="true"
class="visually-hidden">`, owned by the practice store. It announces:

- Item loaded: "Item 3 of 7: Bum-ditty on G. 72 BPM. Forward to play, Back to hear it."
- Transport changes: "Count-in", "Playing, loop 2", "Stopped".
- The rating prompt and each highlight: "Shaky selected. Forward to save."
- The save: "Logged shaky at 72 BPM. Next tempo 72."
- Tempo changes: "76 BPM".
- Manual steps: "Strike, string 3, open, G".

It does **not** narrate each note during playback, which would bury a screen-reader
user. The visible glance line is the per-note channel.

**Color independence checklist:**

- Every role has shape, color, and label.
- Every state differs in size, fill, or edge, not hue.
- Ratings have icon, word, and color.
- Toggles have a fill, a bar, an icon, and `aria-pressed`.
- The playhead is a line plus a band.
- Strokes are glyphs plus words.

---

## 11. Sources

- Okabe & Ito, *Color Universal Design* (2008). I took the hex values from the
  [conceptviz reference](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference)
  and the [khroma README](https://cran.r-project.org/web/packages/khroma/readme/README.html).
  The same README covers Paul Tol's schemes, which I considered and did not choose.
- Machado, Oliveira & Fernandes (2009), CVD simulation matrices. I used them for the
  CIEDE2000 check in §1.2.
- WCAG 2.2 success criteria 1.4.3, 1.4.11, 2.4.7, 2.4.13, and 2.5.8: contrast, non-text
  contrast, focus appearance, and target size.
- Pedal modes:
  - [PageFlip Cicada manual](https://c3.zzounds.com/media/PageFlipCicada_Bluetooth_Pedal_Manual-d813f8eda6250e6bf1900e609d0f3011.pdf)
  - [PageFlip Butterfly at B&H](https://www.bhphotovideo.com/c/product/1303962-REG/pageflip_pfbutterfly01_butterfly_wireless_bluetooth.html)
  - [AirTurn BT200 manual](https://www.mcgill.ca/library/files/library/bt200_manual.pdf)
  - [AirTurn PEDpro manual](https://cdn.shopify.com/s/files/1/1109/4160/files/apps_PEDpro-Manual-English.pdf)
- Soundslice:
  - [Visual fretboard](https://www.soundslice.com/help/en/player/advanced/21/visual-fretboard/):
    notes in the current bar are gray, and the sounding note turns orange. This is the
    model for the dim, active, and amber choices here.
  - [Playhead styles](https://soundslice.com/blog/221/new-customize-playhead-style-and-behavior):
    the default is an orange line that colors the current notes and bar.
- Fender, [How to read a chord chart](https://fender.com/articles/chords/how-to-read-a-chord-chart):
  fingers 1–4 and T, O/X above the nut.
- Yousician [tab help](https://support.yousician.com/hc/en-us/articles/206932099-How-to-read-guitar-tablature):
  it uses finger-coded colors. This is a counter-example; color alone is what we avoid.
- [Modern Font Stacks](https://modernfontstacks.com/), "Old Style" stack.
