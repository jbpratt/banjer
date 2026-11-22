# Clawhammer banjo: domain research for Banjer

Source material for the typed data (`src/theory`, `content/`) and the curriculum. Every
pitch, chord shape, scale position, and arrangement note in this file was checked with a
script (tuning + string/fret → MIDI → pitch class). Facts that only come from forum
snippets, or that I could not confirm, are marked **UNVERIFIED**.

Conventions used throughout:

- Strings are 1–5. String 1 is the highest-pitched *long* string, and string 5 is the short
  drone string. Per-string data is always listed in the order 1, 2, 3, 4, 5.
- Pitches are written as scientific pitch plus MIDI number (C4 = 60).
- Frets on strings 1–4 are relative to the capo. On string 5, `0` means open and a
  number ≥ 6 is the absolute neck fret, as in tab.

---

## 0. What the data model must get right

1. **The 5th string is the highest pitch on the instrument.** In open G it is G4 (67),
   above string 1 (D4, 62). Pitch does not rise with string number, so code that wants
   "the highest string" must compare MIDI numbers.
2. **Tuning names are written 5→1.** `gDGBD` means 5 = g (G4), 4 = D (D3), 3 = G (G3),
   2 = B (B3), 1 = D (D4). The lowercase first letter marks the re-entrant 5th string. This
   is the reverse of Banjer's per-string order, so a parser must reverse it.
3. **5th-string pitch math.** The 5th-string nut sits at neck fret 5. When the 5th string is
   fretted at neck fret *n* (n ≥ 6), it sounds the string's tuned pitch + (n − 5).
   A spike or a 5th-string capo changes what `0` sounds like, but it does not change that
   formula. See §2 for the model.
4. **One bum-ditty is one beat.** The basic stroke is long-short-short in a 2:1:1 ratio.
   Most beginner tab writes it as a quarter and two eighths in 4/4, two strokes per bar.
   **Banjer should author it in 2/4 as `'8' + '16' + '16'`.** That way the quarter-note BPM
   equals bum-ditties per minute, which is the number old-time players quote (about 120
   for dance tempo, per Levenson). See §4.3.
5. **A brush is one event covering several strings.** Each brushed string takes its fret
   from the left-hand shape being held. The hand moves toward string 1, so the
   highest-numbered string in the brush sounds first.
6. **Hammer-ons, pull-offs, and slides have no right-hand stroke.** They split the "bum"
   in half. In 2/4 that is `16 strike` followed by `16 hammer`, `16 pull`, or `16 slide`
   on the same string.
7. **A thumb stroke on strings 1–4 is a drop-thumb.** Double-thumbing is a *pattern*, not a
   stroke, and its definition differs between teachers (§4.2). Store thumb strokes with a
   string number and treat the pattern names as lesson labels only.
8. **Double D is double C with a capo.** It is played as double C, capo 2, with the 5th string
   raised to A (aDADE). Players also retune to aDADE with no capo. Model it as tuning + capo,
   and only offer a retuned preset as an option.

---

## 1. Tunings

| Tuning (5→1) | Name | 1 | 2 | 3 | 4 | 5 | Home key / mode | Typical tunes |
|---|---|---|---|---|---|---|---|---|
| gDGBD | **Open G** ("G tuning") | D4 62 | B3 59 | G3 55 | D3 50 | G4 67 | G major (also C, D7, Em with chords) | Cripple Creek, Boil Them Cabbage Down, Skip to My Lou (Costello); Old Joe Clark (Dummies); G versions of Cumberland Gap (Peghead) |
| gCGCD | **Double C** | D4 62 | C4 60 | G3 55 | C3 48 | G4 67 | C major / C mixolydian | Soldier's Joy (Dummies, Peghead); Angeline the Baker (Peghead); Way Down the Old Plank Road (Costello) |
| gDGCD | **G modal / sawmill / mountain modal** | D4 62 | C4 60 | G3 55 | D3 50 | G4 67 | G modal (mixolydian / dorian), a Gsus4 drone | Cluck Old Hen (Dummies, Peghead); Shady Grove (Peghead); Omie Wise (Costello) |
| gCGBD | **Standard C** ("C tuning", "drop C") | D4 62 | B3 59 | G3 55 | C3 48 | G4 67 | C major (G is also easy) | Mostly classic and parlor repertoire. Reported as the dominant tuning c. 1865–1965 and uncommon in old-time today (forum snippet, **UNVERIFIED**). |
| aDADE | **Double D** | E4 64 | D4 62 | A3 57 | D3 50 | A4 69 | D major / D mixolydian | The D-key double C repertoire: Soldier's Joy, Angeline the Baker, and Tommy Jarrell's Cumberland Gap (Peghead) |
| f#DF#AD | **Open D** | D4 62 | A3 57 | F#3 54 | D3 50 | F#4 66 | D major | In the Pines and Reuben's Train (forum, **UNVERIFIED**). Many players prefer double C capo 2 for D fiddle tunes (forum). |

Notes:

- **Retuning from open G.** Double C lowers string 4 (D3 → C3) and raises string 2 (B3 → C4);
  check that 2/2 matches open string 1 (Deering, Dummies). Sawmill only raises string 2
  (B3 → C4). From double C, raise string 4 (C3 → D3) to get sawmill (Dummies).
- **Open D's 5th string** is tuned to either F#4 (66) or A4 (69). Both are in use (forum).
  Store it as a tuning variant.
- **Open G with string 2 fretted at fret 1** gives the sawmill pitches. Costello plays Cluck
  Old Hen this way, holding 2/1 down instead of retuning.

### Getting to A and D

The usual method is a capo at 2 with the 5th string raised two semitones to A4 (69). That is
done with a spike at neck fret 7, a 5th-string capo, or by tuning the 5th string up.

| From | Capo | 5th string | Sounding (5→1) | Key | Source |
|---|---|---|---|---|---|
| Open G | 2 | A4 (spike 7) | aEAC#E: 1=E4 64, 2=C#4 61, 3=A3 57, 4=E3 52, 5=A4 69 | A (Cripple Creek, Old Joe Clark) | Costello; Deering/banjo.com spike docs |
| Double C | 2 | A4 | aDADE: 1=E4 64, 2=D4 62, 3=A3 57, 4=D3 50, 5=A4 69 | D (Soldier's Joy, Angeline) | Peghead Nation Soldier's Joy |
| Sawmill | 2 | A4 | aEADE: 1=E4 64, 2=D4 62, 3=A3 57, 4=E3 52, 5=A4 69 | A modal (Cluck Old Hen in A) | Banjo Hangout tab notes (snippet) |
| Standard C | 2 | A4 | aDAC#E: 1=E4 64, 2=C#4 61, 3=A3 57, 4=D3 50, 5=A4 69 | D | derived (pitch-checked) |

- **For D tunes, don't start from open G.** Capoing open G cannot reach D in a usable way,
  because the 5th string would need neck fret 12. Use double C capo 2 or open D.
- **The alternative to a capo is retuning all five strings up two semitones** (for example
  double C → aDADE). It is common for double D. For open G → A it is **UNVERIFIED** how
  common it is (string tension); the capo is the standard method there.
- **Above fret 5, a regular capo also catches the 5th string** (Costello). Treat that as a
  special case.

Sources: Deering, *How to Tune Your Banjo to Double C*; Dummies (Bill Evans), *Double C
Tuning*, *Modal Tuning*; Peghead Nation lessons (Soldier's Joy, Shady Grove, Cumberland
Gap); Patrick Costello, *The How and the Tao of Old-Time Banjo* (2003), pp. 46, 116–120;
Langston banjo chords page (sawmill pitches); Banjo Hangout snippets. Full URLs are at the
end.

---

## 2. Neck facts for rendering

| Fact | Value | Confidence |
|---|---|---|
| Frets | **22** is standard on 5-string banjos: Deering Goodtime, Goodtime Special, and Vega Vintage Star are all 22. | Verified (retailer and Deering specs) |
| Scale length | **26¼ in (≈ 667 mm)** is the default. | Verified for Deering/Vega. The range across other makers (≈ 25½–27 in) is **UNVERIFIED**. |
| 5th-string start | The 5th-string nut/peg is at **fret 5**. Its open pitch equals string 1 at fret 5 in open G and double C (G4). | Verified |
| 5th-string vibrating length | scale × 2^(−5/12) ≈ **19.67 in** for a 26¼ in scale | Computed |
| Inlays | **3, 5, 7, 10, 12, 15, 17, 19, 22**. Banjos mark 10 and 22, where guitars mark 9 and 21. | Verified (forum consensus plus PRINCIPLES.md). The double marker at 12 varies by maker (**UNVERIFIED**). |
| Railroad spikes | Small hooks on the 5th string at **neck frets 7, 9, 10**, giving A4 69, B4 71, C5 72 with a G4 5th string. Some players install only 7 and 9. | Verified (Deering spikes; banjo.com) |
| Scooped fretboard | Many old-time openbacks remove the frets above roughly 17 for the right hand. | **UNVERIFIED**, so don't render it by default |

Fret positions from the nut (equal temperament, `d(n) = L·(1 − 2^(−n/12))`, L = 26.25 in):

| Fret | 1 | 2 | 3 | 5 | 7 | 10 | 12 | 17 | 22 |
|---|---|---|---|---|---|---|---|---|---|
| in | 1.473 | 2.864 | 4.176 | 6.585 | 8.730 | 11.518 | 13.125 | 16.417 | 18.884 |
| mm | 37.4 | 72.7 | 106.1 | 167.3 | 221.7 | 292.5 | 333.4 | 417.0 | 479.6 |

**A 5th-string model that covers spikes, capos, and retuning:**

```
fifthString: { tuned: MIDI at the 5th-string nut (e.g. 67), stop?: neck fret of spike/5th-capo (e.g. 7) }
sounding(0)      = tuned + (stop ? stop - 5 : 0)
sounding(n >= 6) = tuned + (n - 5)      // n must be > stop when a stop is set
```

Retuning (G4 → A4, no spike) changes `tuned`. A spike changes `stop`. Both sound A4 at `0`.
They differ only for fretted 5th-string notes, which are rare in clawhammer. How tab
writes the 5th string under a capo is not consistent across sources. In practice it is
written as `0` (open), which matches this model (**UNVERIFIED** as universal).

---

## 3. Chord shapes

Frets are listed for strings 1, 2, 3, 4, 5, where `x` = not played. In clawhammer the thumb
plays the open 5th string on nearly every beat, whatever the chord, so every shape lists it
as `0`. The "5th" column says how that drone relates to the chord. That matters when
rendering chord diagrams and for strummed chords. Fingers are 1 = index, 2 = middle,
3 = ring, 4 = pinky, and `-` = open.

Banjo chord diagrams in books show the strings 4-3-2-1 from left to right and omit the 5th
string (Costello, p. 17). The renderer should match that, even though the data uses
1→5 order.

**Fingering confidence.** "Src" means the source gives the fingering. "Sugg" means I suggest
it: the pitches are verified, but the fingering is mine.

### Open G (gDGBD), key of G

| Chord | Role | Frets 1,2,3,4,5 | Fingers 1,2,3,4 | Pitches 1→4 | 5th (G4) | Fingering |
|---|---|---|---|---|---|---|
| G | I | 0,0,0,0,0 | -,-,-,- | D4 B3 G3 D3 | chord tone | Src |
| C | IV | 2,1,0,2,0 | 3,1,-,2 | E4 C4 G3 E3 | chord tone | Src (Dummies: index 2/1, middle 4/2) |
| C (partial) | IV | 2,1,0,x,0 | 2,1,-,x | E4 C4 G3 | chord tone | Src (Costello) |
| D7 (easy, no 3rd) | V7 | 0,1,2,0,0 | -,1,2,- | D4 C4 A3 D3 | drone (non-chord) | Src (Dummies, Costello, Deering) |
| D7 (full) | V7 | 0,1,2,4,0 | -,1,2,4 | D4 C4 A3 F#3 | drone | Sugg (a forum mentions an x0210 alternative "when the F# bass is not wanted") |
| D | V | 4,3,2,0,0 | 3 or 4,2,1,- | F#4 D4 A3 D3 | non-chord (rubs against F#4; clawhammer usually drones it anyway) | Sugg (Deering: 1/4 with pinky or ring) |
| Em | vi | 2,0,0,2,0 | 3,-,-,2 | E4 B3 G3 E3 | chord tone | Sugg (the C shape minus the index) |
| Am | ii | 2,1,2,2,0 | 4,1,2,3 | E4 C4 A3 E3 | 7th (Am7 color) | Sugg |
| G7 | V7/IV | 3,0,0,0,0 or 0,0,0,3,0 | 3,-,-,- / -,-,-,3 | F on string 1 or 4 | chord tone | Src (Costello, p. 45) |
| E | (V/vi) | 2,0,1,2,0 | 3,-,1,2 | E4 B3 G#3 E3 | clashes (G vs G#); mute or drop-thumb instead | Src (Costello: "first chord in the F position is an E") |

**Movable shapes in open G** (no open strings, so they slide anywhere; n = fret offset):

| Shape | Frets 1,2,3,4 at first position | Root at | Fingers | Example | Minor / 7th |
|---|---|---|---|---|---|
| **F shape** | 3,1,2,3 (= F) | strings 1 and 4 | 4,1,2,3 | +2 → G (5,3,4,5) | Fm 3,1,1,3; F7 1,1,2,3 |
| **D shape** | 4,3,2,4 (= D) | string 2 | 4,2,1,3 | +5 → G (9,8,7,9) | Dm 3,3,2,3 |
| **Barre** | n,n,n,n (= G + n) | string 3 | index barre | 5,5,5,5 = C; 2,2,2,2 = A | minor: 2,1,2,2 = Am (the Am above is the barre-minor at fret 2) |

The same letter chord sits 4 frets higher in the D shape than in the F shape (Dummies).
Costello calls the D shape the "C position", because it is the full C chord moved up two
frets. Use the F / D / barre names, since they are the common ones.

### Double C (gCGCD), key of C

| Chord | Role | Frets 1,2,3,4,5 | Fingers | Pitches 1→4 | 5th (G4) | Fingering |
|---|---|---|---|---|---|---|
| C | I | 2,0,0,0,0 | 2,-,-,- | E4 C4 G3 C3 | chord tone | Src (Costello diagram) |
| C (drone) | I | 0,0,0,0,0 | — | D4 C4 G3 C3 (Csus2) | chord tone | The idiomatic double C sound |
| F | IV | 3,0,2,0,0 | 3,-,2,- | F4 C4 A3 C3 | (G = 9th) | Src (Costello diagram; forum "x0203") |
| G | V | 0,2,4,2,0 | -,2,3,1 | D4 D4 B3 D3 | chord tone | Src (Costello: "awkward") |
| G5 (no 3rd) | V | 0,2,0,2,0 | -,2,-,1 | D4 D4 G3 D3 | chord tone | Src (Costello: use it "99% of the time"; forum "02020") |
| G7 (no 3rd) | V7 | 3,2,0,2,0 | 3,2,-,1 | F4 D4 G3 D3 | chord tone | Sugg (derived) |
| Am | vi | 2,0,2,0,0 | 2,-,1,- | E4 C4 A3 C3 | 7th (Am7 color) | Pitches match forum "x0202" (5→1 order); fingering Sugg |
| Dm | ii | 3,2,2,2,0 | 2, barre 1 on strings 2–4 | F4 D4 A3 D3 | 11th (drone color) | Sugg (derived) |

### Sawmill (gDGCD), G modal

| Chord | Role | Frets 1,2,3,4,5 | Fingers | Pitches 1→4 | Fingering |
|---|---|---|---|---|---|
| G5 (no 3rd) | I | 0,2,0,0,0 | -,2,-,- | D4 D4 G3 D3 | Src (Costello diagram) |
| G (open drone) | I | 0,0,0,0,0 | — | D4 C4 G3 D3 (Gsus4) | the tuning itself |
| G (with B) | I | 0,2,4,0,0 | -,1,3,- | D4 D4 B3 D3 | Sugg (stretch, rarely needed) |
| C | IV | 2,0,0,2,0 | 3,-,-,2 | E4 C4 G3 E3 | Src (Costello diagram) |
| F | ♭VII | 3,0,2,3,0 | 3,-,1,2 | F4 C4 A3 F3 | Src (Costello diagram); fingering Sugg |
| D5 / D7 (no 3rd) | V | 0,2,2,0,0 / 0,0,2,0,0 | -,2,1,- / -,-,2,- | D4 D4 A3 D3 / D4 C4 A3 D3 | Sugg (derived) |
| Am | ii | 2,0,2,2,0 | 3,-,1,2 | E4 C4 A3 E3 | Sugg (derived) |
| Dm | v | 3,2,2,0,0 | 3,2,1,- | F4 D4 A3 D3 | Sugg (derived) |

### Double D (aDADE)

Use the **double C frets unchanged with capo 2**. The sounding chords move up a whole step:
C → D, F → G, G → A, Am → Bm, Dm → Em. The 5th string becomes A4.

Sources: Costello pp. 17–22, 45–52, 116–119 (diagrams read from the PDF); Dummies, *Banjo
Chords: How to Finger G, D7 and C*; Deering, *Learn 3 Easy Banjo Chords* and *D chord*;
Dummies (*Bluegrass Banjo For Dummies*), *Mapping Out Up-the-Neck Chords*; Banjo Hangout
double C chord thread (snippet).

---

## 4. Technique vocabulary and tab

### 4.1 Strokes and articulations

| Term | What the hands do | Where it falls in a beat (Banjer 2/4) | Banjer stroke |
|---|---|---|---|
| **Strike** ("bum", "bump", "claw") | A down-stroke on one string with the back of the index or middle fingernail. The hand and forearm move as a unit, the finger does not flick, and the thumb stays planted on the 5th string. | On the beat: `8` | `strike` |
| **Brush** ("dit", "ham") | A down-stroke across several strings, usually strings 1–2 or 1–3. All four is uncommon, and the 5th string is never brushed. | The "&": `16` | `brush` (string set) |
| **Thumb** ("ty", "mer") | The thumb, already resting on the 5th string, rolls off it as the brush finishes, sounding the drone. | The "a": `16` | `thumb` 5/0 |
| **Bum-ditty** | strike + brush + thumb, in a 2:1:1 ratio | 1 beat = `8 · 16 · 16` | pattern |
| **Hammer-on** | Strike, then a left-hand finger lands on a higher fret of the same string. No new right-hand stroke ("bum-a-ditty"). | It splits the strike: `16 strike · 16 hammer` | `hammer` |
| **Pull-off** | Strike a fretted note, then the left finger plucks sideways off the string to a lower fret or open string. | `16 strike · 16 pull` | `pull` |
| **Slide** | Strike, then slide the fretting finger up (or down) while keeping pressure. | `16 strike · 16 slide` | `slide` |
| **Drop-thumb** | The thumb plays string 2, 3, or 4 instead of the 5th string, on an off-beat. | Usually on the "e", after a strike: `16 strike · 16 thumb(2–4) · 16 strike · 16 thumb 5` | `thumb` on strings 1–4 |
| **Double-thumbing** | A pattern; see 4.2. | — | pattern |
| **Left-hand pluck** (left-hand pizzicato, "pull-off from nowhere") | A left-hand finger plucks a string that was not struck, usually an open string, by pulling off from it. | Any off-beat sixteenth | `lhPluck` |
| **Galax lick** | The index sounds strings 3, 2, 1 one at a time in an even rhythm ("arpeggiated brush"), then the thumb plays the 5th. Named for Galax, VA. | Four evenly spaced notes in one beat: 3·2·1·5 | pattern (strike × 3 + thumb) |

Rules for authors and validators:

- **The 5th string is only ever played by the thumb.**
- **The left-hand finger stays down through the brush.** The brush takes its frets from
  whatever shape is held.
- **A drop-thumb lands on a higher-numbered string than the strike before it** (1→2, 1→3,
  2→3, 2→4). The striking finger follows through and rests on the next string toward
  string 1 (Dummies), so the thumb can't reach "below" it. This is derived from the technique
  description and works as a validator rule, but it is not a sourced rule.

### 4.2 Terminology conflicts

Both drop-thumbing and double-thumbing are used in different senses. The Banjer
definitions are in the last column.

| Term | Costello; Wikipedia | Ken Perlman (after Pete Seeger); Bill Evans (Dummies) | Banjer definition |
|---|---|---|---|
| Drop-thumb | strike–thumb(inner)–strike–thumb(5): a string of eighths (Costello's 4/4) | (same motion, called "double-thumbing") | A thumb stroke on strings 2–4 |
| Double-thumbing | Thumb the 5th after *every* single-note strike (strike–5–strike–5), which "cuts quarter notes in half" | The thumb alternates between a long string and the 5th: strike 1, thumb 2, strike 1, thumb 5 | Avoid it as a technique name. Label the concrete patterns as "drop-thumb (1-2-1-5)" and "double-thumb (strike-5-strike-5)". |

A related term is the **skip-stroke** or "ghost brush" (Perlman): an omitted stroke whose
time is kept. Model it as a rest in the stroke slot.

### 4.3 Rhythm, meter, and counting

The same sound is written three ways:

| Convention | Bum-ditty | Per bar | Who uses it |
|---|---|---|---|
| 4/4, quarter + 2 eighths | `4 · 8 · 8`, counted "1 · 2 &" | 2 | Most beginner tab: Costello ("a quarter note and two eighth note value"), Erbsen/Native Ground, Dummies ("first note lasts twice as long") |
| 2/4, quarter + 2 eighths | `4 · 8 · 8` | 1 | Wikipedia's illustration |
| **2/4, eighth + 2 sixteenths** | `8 · 16 · 16`, counted "1 (e) & a" | 2 | Fiddle-tune transcriptions (Traditional Tune Archive ABCs use 2/4 at L:1/16); Levenson's tempo convention ("2/4 … a quarter note is one beat") |

- **Decision for Banjer: author in 2/4 with `8 · 16 · 16`.**
  - The app's quarter-note BPM then equals bum-ditties per minute. That is the
    foot-tap and dance beat, and it is the number players quote (Levenson: about 120 for
    dance). Writing it in 4/4 would double every tempo (Levenson: "120 bpm in 2/4 … 240 bpm in
    4/4").
  - A standard 8-bar fiddle-tune part stays 8 bars (16 beats).
  - A metronome click per quarter lands on every "bum".
  - To import 4/4 tab, halve every duration.
- **Count it as "1 e & a".** The strike sounds on 1 and lasts through the "e", the brush is on
  the "&", and the thumb is on the "a". Hammer-ons, pull-offs, slides, and drop-thumbs fill
  the "e".
- **Costello's foot tap,** written in 4/4: tap on the bump, tap on the dit, and the ty falls on
  the up-beat as the foot rises. In Banjer's 2/4 terms the foot taps on the beat and on the
  "&".

### 4.4 Tab conventions

| Element | Usual marking | Source |
|---|---|---|
| Staff | 5 lines, **string 1 on the top line**, string 5 on the bottom. The fret number sits on the line. | Deering, *How to Read Banjo Tab* |
| Rhythm | Stems and beams *below* the staff: a quarter is a bare stem, eighths have one beam, sixteenths have two | Deering; Banjo Hangout (snippet) |
| Brush | `b` (or `B`) under the note, or a vertical stack of numbers, or an arrow | Dummies ("the letter b, found below… the tab staff") |
| Strike finger | `i` (index) or `m` (middle) under the note | Dummies |
| Thumb / drop-thumb | `T` or `t` under the note. On the 5th string it is often left unmarked, because only the thumb plays it. | Peghead Nation ("a drop-thumb is indicated with a T") |
| Hammer, pull, slide | `H`, `P`, `S` (or `SL`) above a slur. ASCII tab uses `h` `p` `/` `\`. | Peghead Nation notation guide; Dummies (`p`, `s`) |
| Left-hand pluck | `+` (borrowed from violin left-hand pizzicato) or `LH` | **UNVERIFIED**: I found no source that defines it |
| Capo | Text above the tab: "Capo 2, 5th string to A" | Peghead; Banjo Hangout tab notes |

Sources: Costello pp. 12–16, 25–28, 61–63; Wikipedia *Clawhammer*; Dummies (Evans) right-hand
basics, right-hand exercises, double-thumbing, and modal tuning (Galax lick); Ken Perlman's
clinic description (Suwannee Banjo Camp); Peghead Nation notation guide; Native Ground; Dan
Levenson, *The Need for Speed*.

---

## 5. Scales and melody

### Open G (gDGBD): first position, frets 0–5

| Scale | Notes low → high as string/fret (pitch) |
|---|---|
| **G major** | 4/0 D3, 4/2 E3, 4/4 F#3, **3/0 G3**, 3/2 A3, 2/0 B3, 2/1 C4, 1/0 D4, 1/2 E4, 1/4 F#4, **1/5 G4 (= 5th open)** |
| **G major pentatonic** | 4/0 D3, 4/2 E3, 3/0 G3, 3/2 A3, 2/0 B3, 1/0 D4, 1/2 E4, 1/5 G4 |
| **G mixolydian** (♭7 = F) | G major with F instead of F#: **4/3 F3**, **1/3 F4** |
| **G dorian** (♭3, ♭7) | G mixolydian with B♭ instead of B: **3/3 B♭3**. Use it to replace the open 2/0. |
| A modes (A mixolydian, A dorian) | The same frets with capo 2 and the 5th string at A |

Alternate positions: B3 = 3/4, D4 = 2/3, C4 = 3/5, G3 = 4/5. On string 1 above first
position: A4 1/7, B4 1/9, C5 1/10.

### Double C (gCGCD): first position

| Scale | Notes low → high |
|---|---|
| **C major** (main melody octave) | 3/0 G3, 3/2 A3, 3/4 B3, **2/0 C4**, 1/0 D4 (or 2/2), 1/2 E4 (or 2/4), 1/3 F4, 1/5 G4 (= 5th open), 1/7 A4 |
| C major (low octave) | **4/0 C3**, 4/2 D3, 4/4 E3, 4/5 F3, 3/0 G3 … |
| **C major pentatonic** | 4/0 C3, 4/2 D3, 4/4 E3, 3/0 G3, 3/2 A3, 2/0 C4, 1/0 D4, 1/2 E4, 1/5 G4, 1/7 A4 |
| **C mixolydian** (♭7 = B♭) | **3/3 B♭3** replaces 3/4 B3. This is the common double C "flat seven" sound. |
| C dorian | Adds E♭: 1/1 or 2/3 E♭4, 4/3 E♭3 |
| D tunes (double D) | The same frets relative to capo 2 |

Sawmill uses the open-G frets on strings 1, 3, and 4, but string 2 is C4. So 2/0 = C4, 2/2 = D4,
B3 is only at 3/4, and the open strings already sound G-C-D, which is why the tuning
suits modal tunes.

### How melody is played with the down-stroke

This recipe is what Banjer arrangements follow (Costello pp. 24–28, 61–63; Dummies):

1. **Reduce the tune to one note per beat** by taking the note that sounds on the beat. If the
   beat falls inside a tied or syncopated note, take that note. Move it to the banjo's
   octave as needed (G3–G4 in open G, G3–A4 in double C).
2. **Strike that note** on the beat. Prefer open strings, then first position. Keep the
   finger down.
3. **Brush strings 1–2** (or 1–3) with whatever the left hand holds. If the held shape is
   the chord, the brush supplies harmony and often the next melody note too.
4. **Thumb the 5th string.** Its G4 (or A4) can *be* the melody. For example, Cripple Creek's
   "g g" is a strike on 1/5 answered by the thumb's G4.
5. **Add the in-between notes** in this order, from easiest to hardest:
   - a hammer-on, pull-off, or slide on the "e"
   - a drop-thumb on the "e"
   - a single-string strike in place of the brush
   - double-thumbing, for runs of single notes

---

## 6. Curriculum (10 lessons)

**Step notation** used in this section and in §7. There is one line per beat; events are
separated by `|`.

```
<dur> <stroke> <string>/<fret>[,<string>/<fret>…]
dur:    4 = quarter (1 beat), 8 = eighth, 16 = sixteenth (meter 2/4, 2 beats per bar)
stroke: strike | brush | thumb | hammer | pull | slide | rest
        brush lists every string it sounds, ascending; the sound order is high string number → 1
        hammer/pull/slide: same string as the previous note, no right-hand stroke
        thumb on 5 = drone "ty"; thumb on 1–4 = drop-thumb
```

**Tempos are beats per minute, where one beat is one bum-ditty** (= Banjer quarter-note
BPM). Double them to compare with 4/4 tab.

### Lesson 1: The strike
- **Goal:** a clean single down-stroke on any chosen string. The thumb rests on the 5th
  string and the finger does not flick.
- **Exercises:**
  ```
  # 1a  ×8 per string, strings 1, 2, 3, 4 in turn
  4 strike 1/0
  # 1b  string walk, one strike per beat, loop
  4 strike 1/0
  4 strike 2/0
  4 strike 3/0
  4 strike 4/0
  4 strike 3/0
  4 strike 2/0
  ```
- **Tempo:** 50 → 90.
- **Common mistakes:**
  - Picking *up* with the finger, a three-finger habit.
  - Flicking the finger instead of dropping the whole hand.
  - The thumb leaving the 5th string.
  - Hitting a neighboring string.
  - A clenched hand. Costello: "Tension just slows things down."

### Lesson 2: Bum-ditty on open strings
- **Goal:** a steady bum-ditty in which the brush and the thumb sound as two distinct notes.
- **Exercises:**
  ```
  # 2a  strike + brush, leave the thumb slot silent (×8)
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 rest
  # 2b  full bum-ditty on string 1 (×16)
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 2c  move the bum: 4 beats each on strings 2, 3, 4 (brush stays 1–2)
  8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 4/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 2d  string walk, one bum-ditty per beat: 1,2,3,4,3,2 (loop)
  ```
- **Tempo:** 50 → 90.
- **Common mistakes:**
  - Rushing the ditty so the rhythm becomes even triplets instead of long-short-short.
  - The thumb sounding *with* the brush instead of after it.
  - The brush catching the 5th string.
  - Brushing all four strings. Dummies: 2–3 strings is the norm.

### Lesson 3: Bum-ditty with chord changes (G, C, D7)
- **Goal:** change chords on the beat without stopping the right hand.
- **Shapes:** G 0,0,0,0; C 2,1,0,2; D7 0,1,2,0 (see §3).
- **Exercises** (strike string 1 throughout. That gives the top chord tone: D4 on G, E4 on C,
  D4 on D7):
  ```
  # 3a  G ↔ C, 2 beats each (loop)
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 1/2 | 16 brush 1/2,2/1 | 16 thumb 5/0
  8 strike 1/2 | 16 brush 1/2,2/1 | 16 thumb 5/0
  # 3b  G ↔ D7, 2 beats each (D7 beat):
  8 strike 1/0 | 16 brush 1/0,2/1 | 16 thumb 5/0
  # 3c  Skip to My Lou progression, beats per chord: G×4 | D7×4 | G×4 | D7×2 G×2   (Costello)
  # 3d  Boil Them Cabbage Down progression, 2 beats per bar: G | C | G | D7 | G | C | G D7 | G
  ```
- **Tempo:** 50 → 90.
- **Common mistakes:**
  - A late change, so the bum lands on the old chord.
  - Fingers landing one at a time. Native Ground: "land … all at the same time."
  - The right hand pausing while the left hand changes.
  - A fretting finger muting the open string next to it.

### Lesson 4: Melody with the strike
- **Goal:** play a melody note on each bum, keep the finger down through the brush, and
  play your first tune.
- **Exercises:**
  ```
  # 4a  G major scale up, one note per beat (then reverse)
  8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 2/1 | 16 brush 1/0,2/1 | 16 thumb 5/0
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
  8 strike 1/4 | 16 brush 1/4,2/0 | 16 thumb 5/0
  8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
  # 4b  low run into G: 4/0, 4/2, 4/4, 3/0 (D3 E3 F#3 G3), one bum-ditty each, brush 1/0,2/0
  # 4c  Boil Them Cabbage Down: arrangement A (§7)
  ```
- **Tempo:** 50 → 90.
- **Common mistakes:**
  - Lifting the fretting finger before the brush.
  - The strike drifting to the wrong string when the target string changes.
  - Slowing down at string crossings.
  - The melody note too quiet relative to the brush.

### Lesson 5: Hammer-ons
- **Goal:** split the bum into two sixteenths without changing the beat ("bum-a-ditty").
  Costello: "The trick here is not to change the rhythm."
- **Exercises:**
  ```
  # 5a  string 3, open → 2 (×8)
  16 strike 3/0 | 16 hammer 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 5b  repeat on 1/0→1/2, 4/0→4/2, 2/0→2/1
  # 5c  rhythm check: plain beat, hammer beat (loop)
  8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  16 strike 3/0 | 16 hammer 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 5d  hammer into a chord (D7): the middle finger lands as part of the shape
  16 strike 3/0 | 16 hammer 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0
  # 5e  apply to Boil Them Cabbage Down, bar 4, both beats (= 5d)
  ```
- **Tempo:** 50 → 85.
- **Common mistakes:**
  - The hammer landing late, which pushes the brush back.
  - A hammer too soft to sound.
  - The finger lifting before the brush.

### Lesson 6: Pull-offs
- **Goal:** pluck off the fretted note with the left hand on the "e".
- **Exercises:**
  ```
  # 6a  string 3, 2 → open (×8)
  16 strike 3/2 | 16 pull 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 6b  repeat on 1/2→1/0, 4/2→4/0, 2/1→2/0; then fretted-to-fretted 1/4→1/2
  # 6c  hammer beat then pull beat (G3→A3, A3→G3), loop
  16 strike 3/0 | 16 hammer 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
  16 strike 3/2 | 16 pull 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 6d  Cripple Creek level 1, then the B-part level 2 (§7)
  ```
- **Tempo:** 50 → 85.
- **Common mistakes:**
  - Lifting straight up so no note sounds. The finger must pluck sideways.
  - The pull landing early.
  - Pulling the string out of tune by bending it.

### Lesson 7: Slides
- **Goal:** strike and then slide one or two frets, keeping pressure the whole way
  (Costello).
- **Exercises:**
  ```
  # 7a  A3 → B3 (×8)
  16 strike 3/2 | 16 slide 3/4 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 7b  E3 → F#3, then resolve to G3
  16 strike 4/2 | 16 slide 4/4 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  # 7c  E4 → F#4 → G4 (top of the G scale)
  16 strike 1/2 | 16 slide 1/4 | 16 brush 1/4,2/0 | 16 thumb 5/0
  8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
  ```
- **Tempo:** 50 → 85.
- **Common mistakes:**
  - Releasing pressure mid-slide, so the note dies.
  - Sliding too early, so the struck note is never heard.
  - Overshooting the target fret.

### Lesson 8: Drop-thumb (and double-thumb)
- **Goal:** the thumb plays an inner string on the "e" while the rhythm stays even.
  Costello warns: "nothing quite as pathetic as drop thumb played badly". Keep it slow.
- **Exercises:**
  ```
  # 8a  1-2-1-5 (×16)
  16 strike 1/0 | 16 thumb 2/0 | 16 strike 1/0 | 16 thumb 5/0
  # 8b  1-3-1-5, then 2-3-2-5, then 2-4-2-5 (thumb string > strike string)
  16 strike 1/0 | 16 thumb 3/0 | 16 strike 1/0 | 16 thumb 5/0
  16 strike 2/0 | 16 thumb 3/0 | 16 strike 2/0 | 16 thumb 5/0
  16 strike 2/0 | 16 thumb 4/0 | 16 strike 2/0 | 16 thumb 5/0
  # 8c  alternate: bum-ditty beat, drop-thumb beat (loop)
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  16 strike 1/0 | 16 thumb 2/0 | 16 strike 1/0 | 16 thumb 5/0
  # 8d  with a fretted note under the thumb (C chord held)
  16 strike 1/2 | 16 thumb 2/1 | 16 strike 1/2 | 16 thumb 5/0
  # 8e  double-thumb (Costello's sense): a melody run with the 5th after every note
  16 strike 1/0 | 16 thumb 5/0 | 16 strike 2/0 | 16 thumb 5/0
  ```
- **Tempo:** 40 → 80.
- **Common mistakes:**
  - The rhythm collapsing into lopsided pairs.
  - The thumb landing late or catching two strings.
  - Forgetting the 5th-string thumb after the drop.
  - Tensing the hand.

### Lesson 9: Double C tuning
- **Goal:** retune, learn the new map, and play Angeline the Baker.
- **Exercises:**
  ```
  # 9a  retune: string 4 D3→C3, string 2 B3→C4; check 2/2 = open 1 (D4) and 4/0 + 2/0 octave
  # 9b  C scale, one note per beat: 3/0 3/2 3/4 2/0 1/0 1/2 1/3 1/5 (G3 A3 B3 C4 D4 E4 F4 G4)
  8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 3/4 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
  8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
  8 strike 1/3 | 16 brush 1/3,2/0 | 16 thumb 5/0
  8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
  # 9c  chord loop, 2 beats each: C (2,0,0,0) | F (3,0,2,0) | C | G5 (0,2,0,2)
  #     strike 2/0 on C, 3/2 on F, 1/0 on G5
  # 9d  Angeline the Baker: arrangement C (§7)
  ```
- **Tempo:** 50 → 90.
- **Common mistakes:**
  - Reaching for the open-G shapes out of habit; 2/0 is now C, not B.
  - Losing the tuning, because retuning drifts its neighbors (Dummies: recheck strings 2
    and 4).
  - Brushing three strings and catching string 3 G3 when two would do.

### Lesson 10: Full tunes, the capo, and the 5th string
- **Goal:** play complete AABB tunes at jam tempo and in jam keys.
- **Exercises:**
  ```
  # 10a  Cripple Creek AABB, level 2, tempo ramp (§8)
  # 10b  same tab, capo 2 + 5th string to A (spike 7): now in A (aEAC#E)
  # 10c  Angeline the Baker AABB in double D (double C, capo 2, 5th to A)
  # 10d  play along with a recording at its real tempo (Levenson: "Listen, listen, listen!")
  # 10e  (optional 11th lesson) sawmill: retune string 2 to C; Cluck Old Hen
  ```
- **Tempo:** 70 → 100. A typical jam runs 90–100 and dance tempo is about 120.
- **Common mistakes:**
  - Forgetting the 5th string when capoing. Tuned to G4 against a capo at 2, it clashes.
  - Losing the form (AABB).
  - Speeding up through the easy part.

Sources: Costello (lesson order, techniques, Skip to My Lou progression, drop-thumb
warnings); Dummies (right-hand exercises, brush width, retuning); Native Ground (chord
landing); Levenson (tempo, recordings).

---

## 7. Tunes

All of these are traditional or 19th-century and in the public domain. *Angelina Baker* is by
Stephen Foster, 1850.

| # | Tune | Tuning (banjo key) | Fiddle/jam key | Lesson fit | Sources |
|---|---|---|---|---|---|
| 1 | Boil Them Cabbage Down | Open G (G) | A or D | 3–5 | Costello (plays it in C, open G); thesession #7398 (D) |
| 2 | Skip to My Lou | Open G (G) | — (song) | 3 | Costello |
| 3 | Cripple Creek | Open G (G); capo 2 → A | A | 6, 10 | Costello (G); Showman (A, 90 bpm) |
| 4 | Old Joe Clark | Open G, capo 2 → A (G mixolydian uncapoed) | A mixolydian | 6–8 | Dummies (G tuning; F chord in the B part); Showman |
| 5 | Cumberland Gap | Open G (G) | G (most versions); D (Jarrell) | 6–8 | Peghead (key G for most versions; the G versions' tuning is **UNVERIFIED** but presumably open G) |
| 6 | Cluck Old Hen | Sawmill (G); capo 2 → A | A dorian/modal | 10/11 | Dummies; Peghead; thesession #10006 (A dorian) |
| 7 | Shady Grove | Sawmill (G modal); capo 2 → A | A modal | 10/11 | Peghead |
| 8 | Angeline the Baker | Double C (C); capo 2 → D | D | 9–10 | Peghead (double C); Showman (D, 90 bpm) |
| 9 | Soldier's Joy | Double C, capo 2, 5th to A (D) | D | 10 | Dummies; Peghead |
| 10 | Way Down the Old Plank Road | Double C (C) | — (song) | 9–10 | Costello |

### Arrangements

These three arrangements are my own and are not copied from any published tab. Each one is
the "one note per beat" skeleton from §5, so every beat is a plain bum-ditty unless marked
as level 2. The tables give the melody notes the arrangement plays on each beat, checked by
script against the source melody listed with it.

#### A. Boil Them Cabbage Down: open G, no capo, key G, 2/4, 8 bars (repeat)

Source check: the song melody in D from abcnotation.com (rlwalker ABC: `FF FF | G2 G2 |
FF FF | E4 | FF FF | GG GG | FF EE | D4`), transposed to G an octave down. The fiddle
version on the Traditional Tune Archive (via abcnotation) has the same beat skeleton except
in bar 7 (fiddle: D4 B3; song: B3 A3).

| Bar | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Chord | G | C | G | D7 | G | C | G D7 | G |
| Beats | B3 B3 | C4 C4 | B3 B3 | A3 A3 | B3 B3 | C4 C4 | B3 A3 | G3 (end) |

```
# bar 1 · G · "Boil them cabbage"
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 2 · C (hold 2,1,0,2) · "down, boys"
8 strike 2/1 | 16 brush 1/2,2/1 | 16 thumb 5/0
8 strike 2/1 | 16 brush 1/2,2/1 | 16 thumb 5/0
# bar 3 · G · "turn them hoecakes"
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 4 · D7 (hold 0,1,2,0) · "round"
8 strike 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0
# bar 5 · G · "only song that"
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 6 · C · "I can sing is"
8 strike 2/1 | 16 brush 1/2,2/1 | 16 thumb 5/0
8 strike 2/1 | 16 brush 1/2,2/1 | 16 thumb 5/0
# bar 7 · G → D7 · "boil them cabbage"
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0
# bar 8 · G · "down"
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
4 brush 1/0,2/0,3/0
```

Level 2 (after lesson 5) replaces both beats of bar 4 with
`16 strike 3/0 | 16 hammer 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0`.

#### B. Cripple Creek: open G, key G (capo 2 + 5th to A for A), 2/4, AABB, 4 bars per part

Source check: the Nottingham Music Database and Colin Hume ABCs (K:A), transposed down a
whole step. A part `aa e/g/f/e/ | df e2 | aa e/f/e/d/ | c/A/B A2` → G4 G4 D4-F#4-E4-D4 |
C4 E4 D4 | … B3-G3 A3 G3. B part `ce/c/ BA | Bc E2 | ce/c/ BA | F/E/F/G/ A2` → B3 D4-B3
A3 G3 | A3 B3 D3 | … E3-D3-E3-F#3 G3. These match Costello's G-key tab in contour, and the
B part matches the low part of thesession #23886.

| Part | Bar 1 | Bar 2 | Bar 3 | Bar 4 |
|---|---|---|---|---|
| A (chords) | G | C → D7 | G | D7 → G |
| A beats | G4 D4 | C4 D4 | G4 D4 | A3 G3 |
| B (chords) | G | G | G | (D7) → G |
| B beats | B3 A3 | A3 D3 | B3 A3 | E3 G3 |

```
# ---- A part (high) · fret 1/5 with the pinky
# bar 1 · G
8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 2 · C → D7
8 strike 2/1 | 16 brush 1/2,2/1 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/1 | 16 thumb 5/0
# bar 3 · G
8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 4 · D7 → G
8 strike 3/2 | 16 brush 1/0,2/1 | 16 thumb 5/0
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# ---- B part (low)
# bar 1
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 2
8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 4/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 3
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 4
8 strike 4/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
```

B part, level 2 (after lessons 5–6). It adds the in-between melody notes A→G, A→B, and E→D:

```
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
16 strike 3/2 | 16 pull 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
16 strike 3/2 | 16 hammer 3/4 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 4/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
16 strike 3/2 | 16 pull 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
16 strike 4/2 | 16 pull 4/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
```

#### C. Angeline the Baker: double C, key C (capo 2 + 5th to A for D), 2/4, AABB, 8 bars per part

Source check: thesession.org #14300, setting 26118 (D) and setting 26119 (G, which
confirms the scale degrees), transposed to C an octave plus a whole step down. A part
`AB d>A | B d2 | AB d/B/A | B3 | AB d>e | fe d>e | fe dB | A>B A` → G3 A3 C4 … The B part
`af ed | fe d | af ed | B>B B | …` → G4 E4 D4 C4 …

The chord labels are suggestions. The bar-7 chord varies between sources (**UNVERIFIED**).
The C bars brush open strings 1–2 (D4 + C4), which gives the characteristic double C drone.

| Part | Bars 1–8 beats |
|---|---|
| A | G3 C4 · A3 C4 · G3 C4 · A3 A3 (F) · G3 C4 · E4 C4 · E4 C4 · G3 G3 |
| B | G4 D4 · E4 C4 · G4 D4 · A3 A3 (F) · G4 D4 · E4 C4 · E4 C4 · G3 G3 |

```
# ---- A part
# bar 1 · C
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 2 · C
8 strike 3/2 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 3 · C
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 4 · F (hold 3,0,2,0)
8 strike 3/2 | 16 brush 1/3,2/0 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/3,2/0 | 16 thumb 5/0
# bar 5 · C
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 6 · C (hold 2,0,0,0)
8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/2,2/0 | 16 thumb 5/0
# bar 7 · C
8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/2,2/0 | 16 thumb 5/0
# bar 8 · C
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# ---- B part · fret 1/5 with ring or pinky
# bar 1 · C
8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 2 · C (hold 2,0,0,0)
8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/2,2/0 | 16 thumb 5/0
# bar 3 · C
8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 4 · F (hold 3,0,2,0)
8 strike 3/2 | 16 brush 1/3,2/0 | 16 thumb 5/0
8 strike 3/2 | 16 brush 1/3,2/0 | 16 thumb 5/0
# bar 5 · C
8 strike 1/5 | 16 brush 1/5,2/0 | 16 thumb 5/0
8 strike 1/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
# bar 6 · C (hold 2,0,0,0)
8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/2,2/0 | 16 thumb 5/0
# bar 7 · C
8 strike 1/2 | 16 brush 1/2,2/0 | 16 thumb 5/0
8 strike 2/0 | 16 brush 1/2,2/0 | 16 thumb 5/0
# bar 8 · C
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
8 strike 3/0 | 16 brush 1/0,2/0 | 16 thumb 5/0
```

---

## 8. Practice pedagogy

### Tempo bands (beats/min, where one beat = one bum-ditty = Banjer quarter BPM)

| Band | BPM | Evidence |
|---|---|---|
| First contact with a new motion | 40–50 | — (pedagogical choice) |
| Slow practice / slow-jam recordings | 45–65 | Fiddlers' Green Early Beginner Circle: slow audio at "60 bpm", range 45–65 |
| Slow jam | ≈ 75 | Pete Showman's collection ("South Bay Jam ver., 75 bpm") |
| Typical jam | 90–100 | Showman (Cripple Creek, Angeline, Soldier's Joy, Old Joe Clark, Cumberland Gap at 90); Fiddlers' Green typical 75–100 |
| Dance / source recordings | 110–150 | Levenson: dance about 120 in 2/4; Wade Ward about 138; Tommy Jarrell about 120 in bands; Hammons family 112–120 |

The Fiddlers' Green site labels a file "60 bpm" whose filename says "120bpm". That is the
same factor of 2 between 2/4 and 4/4, so always state the beat unit.

### Metronome

1. **Stage 1: click on every beat** (each bum). The foot taps with the click.
2. **Stage 2: click on the off-beat** (the "&", where the brush falls). In Costello's 4/4
   counting this is clicking on 2 and 4, and it trains the brush to drive the rhythm.
   This is a general-pedagogy technique (Bob Reynolds, "metronome on 2 & 4"); I found no
   clawhammer source that prescribes it (**UNVERIFIED** as old-time practice).
3. **Stage 3: click once per bar, or at half speed.** This builds internal time (Yamaha:
   halve the tempo and let the clicks fall on 1 and 3).
4. **At slow tempos, a subdivided click helps** keep the 16th grid even (Musicnotes: "feel
   an eighth note pulse"). Offer it as an option, not as the default.

The app needs `click: 'beat' | 'offbeat' | 'bar' | 'subdivide'` per item.

### Ramping rule (maps to clean / shaky / lost)

- **Start** at about 60% of the target, never below 40. Musicnotes suggests starting at half
  the target.
- **Clean:** add 2–4 BPM. Musicnotes says "2–4 BPM at a time" and never more than 4.
- **Shaky:** stay at the same tempo.
- **Lost:** drop 8 BPM.
- **Cap** at the item's target, then move the learner to playing along with real recordings.
  Levenson: "Too slow and the music stagnates."

### The most common clawhammer mistakes

1. **Picking up instead of striking down.** This is the main trap for three-finger players
   (Costello).
2. **Flicking the finger.** Drop the whole hand, keep the finger's shape, and let the forearm
   or wrist do the work. Costello: "Do not flick your fingers"; Dummies says the same.
3. **The thumb leaving the 5th string** during the strike and brush (Costello, Dummies).
4. **Uneven rhythm,** either rushing the ditty or drifting tempo. Costello: "Rhythm is
   everything." Use the metronome stages above.
5. **An over-wide brush,** across all four strings or catching the 5th. The norm is 2–3
   strings (Dummies).
6. **Lifting the melody finger before the brush,** which loses the harmony and sustain.
7. **Ornaments that shift the beat.** A hammer, pull, or slide must fall exactly on the "e"
   (Costello).
8. **Tension** in the hand, shoulder, or grip (Costello).
9. **Fingers landing piecemeal on chord changes** (Native Ground).
10. **Forgetting the 5th string when capoing** (Costello: retune it to A at capo 2).

---

## 9. Open questions / UNVERIFIED

- The Galax lick's exact note values. Evans says only "even rhythm" across strings 3-2-1 then
  the thumb on 5; the four sixteenths are my reading.
- The tab symbol for a left-hand pluck (`+` vs `LH`).
- Fingerings marked "Sugg" in §3. The pitches are verified; the fingerings are mine.
- The chord in bar 7 of Angeline the Baker.
- Which tuning the G versions of Cumberland Gap use (presumably open G).
- Typical old-time tunes in standard C, and the "dominant tuning 1865–1965" claim, which
  comes from a forum snippet.
- In the Pines and Reuben's Train in open D (forum only).
- How tab writes the 5th string under a capo (assumed `0`).
- The scooped-fretboard fret count, and whether the 12th-fret marker is a double dot.
- Off-beat metronome clicks as a specifically old-time practice.
- The drop-thumb rule "thumb string > strike string". It is derived from the technique
  descriptions, not sourced.
- Banjo Hangout pages could not be fetched (sign-in checkpoint). The claims attributed to it
  come from search-result snippets.

---

## Sources

- Patrick Costello, *The How and the Tao of Old-Time Banjo* (Pick-Ware, 2003), PDF:
  https://ia801601.us.archive.org/34/items/PatrickCostello/The%20How%20and%20the%20Tao%20of%20Old-Time%20Banjo.pdf
  (pp. 12–28 basic frailing, note values, and first chords; 45–52 movable chords and capo;
  61–63 double and drop thumb; 116–120 alternate tunings and chord diagrams)
- Dan Levenson, *The Need for Speed*: https://clawdan.com/articles/the-need-for-speed/
  (also https://clawdan.com/?p=367)
- Ken Perlman clinic description (double-thumbing after Seeger; skip-strokes):
  https://www.tickettailor.com/events/suwanneebanjocamp/576895
- Deering:
  - https://www.deeringbanjos.com/blogs/deering-banjos-blog/how-to-tune-your-banjo-to-double-c-tuning
  - https://blog.deeringbanjos.com/how-to-read-banjo-tab
  - https://www.deeringbanjos.com/products/5th-string-banjo-spikes
  - https://www.deeringbanjos.com/blogs/deering-banjos-blog/5th-string-banjo-capos-whats-the-best
  - https://blog.deeringbanjos.com/5-string-banjo-for-beginners-d-chord
  - https://www.deeringbanjos.com/blogs/deering-banjos-blog/learn-3-easy-banjo-chords
  - https://www.deeringbanjos.com/en-ca/products/goodtime-special-banjo
- Bill Evans, *Banjo For Dummies*, excerpts on dummies.com:
  - Modal tuning and the Galax lick: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/modal-tuning-for-banjos-155952
  - Double thumbing: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/double-thumbing-on-the-banjo-155936
  - Right-hand exercises: https://dummies.com/article/academics-the-arts/music/instruments/banjo/4-clawhammer-banjo-right-hand-exercises-155622
  - Right-hand basics: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/clawhammer-banjo-right-hand-basics-155596
  - G, D7, C: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/banjo-chords-how-to-finger-g-d7-and-c-156068
  - Double C and Soldier's Joy: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/double-c-tuning-on-a-banjo-155937
  - Old Joe Clark: https://www.dummies.com/article/academics-the-arts/music/instruments/banjo/how-to-play-a-clawhammer-classic-on-the-banjo-155922
  - Movable F/D/barre shapes: https://www.dummies.com/article/mapping-out-up-the-neck-chords-on-the-bluegrass-banjo-143066
- Peghead Nation:
  - Notation guide: https://pegheadnation.com/string-school/music-notation-guide/
  - Soldier's Joy: https://pegheadnation.com/string-school/courses/clawhammer-banjo/soldiers-joy-part-1
  - Shady Grove: https://pegheadnation.com/string-school/courses/clawhammer-banjo/shady-grove
  - Cumberland Gap: https://www.pegheadnation.com/string-school/courses/clawhammer-banjo/cumberland-gap-g-part-1-marcus-martin-version/
- Wikipedia, *Clawhammer*: https://en.wikipedia.org/wiki/Clawhammer
- Native Ground (Wayne Erbsen):
  - https://nativeground.com/a-word-about-these-free-clawhammer-banjo-tabs/
  - https://nativeground.com/banjo-chords/
- Tempos:
  - Pete Showman's collection: https://www.fiddlers.org/?p=1561
  - Fiddlers' Green Early Beginner Circle: https://www.fiddlers.org/?p=38
  - Musicnotes, metronome practice: https://www.musicnotes.com/now/tips/how-to-practice-with-a-metronome
  - Bob Reynolds, metronome on 2 & 4 (search snippet only): https://lessons.bobreynoldsmusic.com/metronome-on-2-4
  - Yamaha, halving the click: https://hub.yamaha.com/pianos/p-how-to/how-to-use-a-metronome-to-develop-timing-skills
- Melodies:
  - thesession.org tunes 14300 (Angeline), 23886 (Cripple Creek), 7398 (Boil the Cabbage
    Down), 10006 (Cluck Old Hen), via `https://thesession.org/tunes/<id>?format=json`
  - abcnotation.com (Cripple Creek, Nottingham Music Database and Colin Hume): https://abcnotation.com/tunePage?a=abc.sourceforge.net/NMD/nmd/reelsa-c.txt/0075
  - abcnotation.com (Boil Them Cabbage Down, rlwalker): https://abcnotation.com/tunePage?a=trillian.mit.edu/~jc/music/abc/mirror/gulfweb.net:34043/~rlwalker/abc/cabbage/0000
  - abcnotation.com (Bile Them Cabbage Down, Traditional Tune Archive): https://abcnotation.com/tunePage?a=tunearch.org/wiki/Bile_Them_Cabbage_Down.no-ext/0001
- Neck and forum material (snippets):
  - UMGF, banjo fret markers: https://umgf.com/fret-markers-on-a-banjo-t208363.html
  - banjo.com, spikes: https://banjo.com/?p=2950
  - Langston, sawmill pitches: https://www.langston.com/Banjo/bc345.php
  - Creek Don't Rise, C → G tuning shift: https://creekdontrise.com/acoustic/c_2_g_tuning_shift.htm
  - Banjo Hangout threads: archive/196066, 262784, 404417, 371062, 329839
