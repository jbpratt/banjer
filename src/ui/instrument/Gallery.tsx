/**
 * Dev showcase for the instrument views. Every fixture is inline; nothing comes from /content.
 */
import { useState, type ReactNode } from 'react'
import type { ChordShape, Position, Setup, StringNum } from '../../domain/types.ts'
import { intervalLabel, noteName, pcOf, pitchClass, scalePositions, soundingMidi, spell } from '../../theory/index.ts'
import { ChordDiagram } from './ChordDiagram.tsx'
import { Fretboard } from './Fretboard.tsx'
import type { FretMarker } from './types.ts'
import styles from './Gallery.module.css'

// ── Fixtures ────────────────────────────────────────────────────────────────

const OPEN_G: Setup = { tuning: 'open-g', capo: 0 }
const DOUBLE_C: Setup = { tuning: 'double-c', capo: 0 }
const CAPO_2: Setup = { tuning: 'open-g', capo: 2 }
const CAPO_2_RAISE_3: Setup = { tuning: 'open-g', capo: 2, fifthRaise: 3 }

const SHAPE_G: ChordShape = { id: 'open-g:G', tuning: 'open-g', symbol: 'G', frets: [0, 0, 0, 0, 0] }
const SHAPE_C: ChordShape = {
  id: 'open-g:C',
  tuning: 'open-g',
  symbol: 'C',
  frets: [2, 1, 0, 2, 0],
  fingers: [3, 1, null, 2, null],
}
const SHAPE_D7: ChordShape = {
  id: 'open-g:D7',
  tuning: 'open-g',
  symbol: 'D7',
  frets: [4, 1, 2, 0, 0],
  fingers: [4, 1, 2, null, null],
}
const SHAPE_EM: ChordShape = {
  id: 'open-g:Em',
  tuning: 'open-g',
  symbol: 'Em',
  frets: [2, 0, 0, 2, null],
  fingers: [2, null, null, 1, null],
}
const SHAPE_D_BARRE: ChordShape = {
  id: 'open-g:D-7fr',
  tuning: 'open-g',
  symbol: 'D',
  frets: [7, 7, 7, 7, 0],
  fingers: [1, 1, 1, 1, null],
  barre: { fret: 7, from: 1, to: 4 },
  movable: true,
}
const SHAPE_C_BARRE: ChordShape = {
  id: 'open-g:C-5fr',
  tuning: 'open-g',
  symbol: 'C',
  frets: [5, 5, 5, 5, null],
  fingers: [1, 1, 1, 1, null],
  barre: { fret: 5, from: 1, to: 4 },
  movable: true,
}
const SHAPE_F_HIGH: ChordShape = {
  id: 'open-g:F-high',
  tuning: 'open-g',
  symbol: 'F6',
  frets: [10, 10, 10, 12, null],
  fingers: [1, 1, 1, 3, null],
  barre: { fret: 10, from: 1, to: 3 },
}
const SHAPE_FIFTH: ChordShape = {
  id: 'open-g:C-5th',
  tuning: 'open-g',
  symbol: 'C6',
  frets: [2, 1, 0, 2, 7],
  fingers: [3, 1, null, 2, 4],
}
const SHAPE_DC_C: ChordShape = { id: 'double-c:C', tuning: 'double-c', symbol: 'C', frets: [2, 0, 0, 0, 0], fingers: [2, null, null, null, null] }

// ── Marker helpers ──────────────────────────────────────────────────────────

function nameAt(setup: Setup, pos: Position): string {
  return spell(pitchClass(soundingMidi(setup, pos)))
}

function shapeMarkers(setup: Setup, shape: ChordShape, labels: 'note' | 'interval' | 'finger' = 'note'): FretMarker[] {
  const root = pcOf((shape.symbol.match(/^[A-G][#b]?/)?.[0] ?? 'C') as 'C')
  const out: FretMarker[] = []
  shape.frets.forEach((fret, i) => {
    const string = (i + 1) as StringNum
    if (fret === null) {
      out.push({ pos: { string, fret: 0 }, role: 'muted' })
      return
    }
    const pos = { string, fret }
    const pc = pitchClass(soundingMidi(setup, pos))
    const finger = shape.fingers?.[i] ?? undefined
    const label = labels === 'interval' ? (pc === root ? 'R' : intervalLabel(root, pc)) : labels === 'finger' ? (finger !== undefined ? String(finger) : '') : spell(pc)
    out.push({
      pos,
      role: pc === root ? 'root' : string === 5 ? 'thumb' : 'chord',
      ...(label ? { label } : {}),
      ...(finger !== undefined && labels !== 'finger' ? { finger } : {}),
    })
  })
  return out
}

// ── Layout bits ─────────────────────────────────────────────────────────────

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{title}</h2>
      {note && <p className={styles.note}>{note}</p>}
      {children}
    </section>
  )
}

function Case({ title, children, narrow }: { title: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={[styles.case, narrow && styles.narrow].filter(Boolean).join(' ')}>
      <h3 className={styles.h3}>{title}</h3>
      {children}
    </div>
  )
}

// ── Gallery ─────────────────────────────────────────────────────────────────

export function Gallery() {
  const [selected, setSelected] = useState<Position | null>(null)

  const gScale = scalePositions(OPEN_G, 'G', 'major', [0, 7]).map<FretMarker>((p) => ({
    pos: p.pos,
    role: p.isRoot ? 'root' : 'scale',
    label: p.isRoot ? 'R' : intervalLabel(0, p.interval),
  }))
  const gPentaFull = scalePositions(OPEN_G, 'G', 'major-pentatonic', [0, 22]).map<FretMarker>((p) => ({
    pos: p.pos,
    role: p.isRoot ? 'root' : 'scale',
    label: spell(pitchClass(p.midi)),
  }))

  const allRoles: FretMarker[] = [
    { pos: { string: 3, fret: 0 }, role: 'root', label: 'R' },
    { pos: { string: 1, fret: 2 }, role: 'chord', label: '3', finger: 2 },
    { pos: { string: 2, fret: 3 }, role: 'scale', label: '6' },
    { pos: { string: 4, fret: 4 }, role: 'melody', label: 'F#', finger: 3 },
    { pos: { string: 5, fret: 0 }, role: 'thumb', label: 'G' },
    { pos: { string: 2, fret: 0 }, role: 'muted' },
    { pos: { string: 1, fret: 5 }, role: 'melody', label: 'G', state: 'active' },
    { pos: { string: 3, fret: 5 }, role: 'root', label: 'C', state: 'next', finger: 1 },
    { pos: { string: 3, fret: 7 }, role: 'scale', label: 'D', state: 'dim' },
    { pos: { string: 4, fret: 7 }, role: 'chord', label: 'A', state: 'dim' },
    { pos: { string: 2, fret: 8 }, role: 'scale', label: 'G', state: 'active' },
    { pos: { string: 1, fret: 9 }, role: 'thumb', label: 'B', state: 'next' },
  ]

  return (
    <div className={styles.gallery}>
      <header className={styles.header}>
        <h1>Instrument gallery</h1>
        <p className={styles.note}>
          Every instrument view in each meaningful state. Resize the window: boards switch to the compact layout under 600 px wide.
        </p>
      </header>

      <Section title="Fretboard: tunings">
        <Case title="Open G (gDGBD), G chord, note labels">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_G)} label="G chord in open G, all strings open; roots on strings 3 and 5" />
        </Case>
        <Case title="Double C (gCGCD), C chord, interval labels">
          <Fretboard setup={DOUBLE_C} markers={shapeMarkers(DOUBLE_C, SHAPE_DC_C, 'interval')} label="C chord in double C; roots marked" />
        </Case>
        <Case title="Empty board, no open names">
          <Fretboard setup={OPEN_G} markers={[]} showOpenNames={false} label="Empty fretboard, frets 0 to 12" />
        </Case>
      </Section>

      <Section title="Fretboard: capo and spike">
        <Case title="Capo 2, 5th string spiked at 7: open A chord (opens sit on the capo and spike)">
          <Fretboard setup={CAPO_2} markers={shapeMarkers(CAPO_2, SHAPE_G)} label="A chord, open G capo 2, 5th string spiked at 7" />
        </Case>
        <Case title="Capo 2, 5th retuned up 3 (spike at 8), fretted shape">
          <Fretboard
            setup={CAPO_2_RAISE_3}
            markers={shapeMarkers(CAPO_2_RAISE_3, SHAPE_C, 'interval')}
            label="D chord shape, capo 2, 5th string at 8"
          />
        </Case>
      </Section>

      <Section title="Fretboard: scales">
        <Case title="G major, frets 0–7, roots ■ and scale rings ○">
          <Fretboard setup={OPEN_G} markers={gScale} frets={[0, 7]} label="G major scale, frets 0 to 7; roots marked" />
        </Case>
        <Case title="G major pentatonic, full neck [0, 22] (marker size shrinks)">
          <Fretboard setup={OPEN_G} markers={gPentaFull} frets={[0, 22]} label="G major pentatonic, full neck; roots marked" />
        </Case>
      </Section>

      <Section title="Fretboard: chord with fingers">
        <Case title="C chord, note labels with finger badges">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_C)} frets={[0, 7]} label="C chord in open G with fingering" />
        </Case>
        <Case title="Em, string 5 muted ×, finger numbers as labels">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_EM, 'finger')} frets={[0, 7]} label="E minor in open G; 5th string not played" />
        </Case>
      </Section>

      <Section title="Fretboard: every role and state">
        <Case title="root ■ chord ● scale ○ melody ◆ thumb ▲ muted ×; rest, active (halo), next (dashed), dim">
          <Fretboard setup={OPEN_G} markers={allRoles} label="All marker roles and states" />
        </Case>
      </Section>

      <Section title="Left-handed">
        <Case title="Mirrored board, C chord (text unmirrored, string order unchanged)">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_C)} frets={[0, 7]} leftHanded label="C chord, left-handed view" />
        </Case>
        <Case title="Left-handed, capo 2 with spike">
          <Fretboard setup={CAPO_2} markers={shapeMarkers(CAPO_2, SHAPE_C)} leftHanded label="C shape with capo 2, left-handed" />
        </Case>
      </Section>

      <Section title="Explorer (onSelect)" note="Tab into the board, then use the arrows; Enter or Space selects. Each position has an accessible name.">
        <Case title={`Selected: ${selected ? `string ${selected.string}, fret ${selected.fret}, ${noteName(soundingMidi(OPEN_G, selected))}` : 'none'}`}>
          <Fretboard
            setup={OPEN_G}
            markers={selected ? [{ pos: selected, role: 'melody', label: nameAt(OPEN_G, selected), state: 'active' }] : []}
            onSelect={setSelected}
            frets={[0, 12]}
            label="Interactive fretboard, open G"
          />
        </Case>
      </Section>

      <Section title="Up the neck">
        <Case title="D barre at 7: window [5, 12] (no nut, slanted edge, ruler starts at 5)">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_D_BARRE)} frets={[5, 12]} label="D barre chord at fret 7" />
        </Case>
        <Case title="Window [9, 17]">
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_F_HIGH)} frets={[9, 17]} label="F6 chord at fret 10" />
        </Case>
      </Section>

      <Section title="Compact layout (< 600 px)">
        <Case title="390 px wide container, [0, 7]" narrow>
          <Fretboard setup={OPEN_G} markers={shapeMarkers(OPEN_G, SHAPE_C, 'interval')} frets={[0, 7]} label="C chord, compact" />
        </Case>
        <Case title="390 px, capo 2 + spike" narrow>
          <Fretboard setup={CAPO_2} markers={shapeMarkers(CAPO_2, SHAPE_G)} frets={[0, 9]} label="A chord with capo, compact" />
        </Case>
      </Section>

      <Section title="Chord diagrams">
        <div className={styles.chordGrid}>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Case key={size} title={`${size}: G, C, D7, Em`}>
              <div className={styles.chordRow}>
                <ChordDiagram shape={SHAPE_G} size={size} />
                <ChordDiagram shape={SHAPE_C} size={size} />
                <ChordDiagram shape={SHAPE_D7} size={size} />
                <ChordDiagram shape={SHAPE_EM} size={size} />
              </div>
            </Case>
          ))}
          <Case title="Emphasis: none, current, next">
            <div className={styles.chordRow}>
              <ChordDiagram shape={SHAPE_C} emphasis="none" />
              <ChordDiagram shape={SHAPE_C} emphasis="current" />
              <ChordDiagram shape={SHAPE_C} emphasis="next" />
            </div>
          </Case>
          <Case title="Barre / up the neck, fretted 5th, no fingers">
            <div className={styles.chordRow}>
              <ChordDiagram shape={SHAPE_D_BARRE} size="lg" />
              <ChordDiagram shape={SHAPE_C_BARRE} size="md" />
              <ChordDiagram shape={SHAPE_F_HIGH} size="md" />
              <ChordDiagram shape={SHAPE_FIFTH} size="lg" />
              <ChordDiagram shape={SHAPE_C} size="md" showFingers={false} />
              <ChordDiagram shape={SHAPE_DC_C} size="md" />
            </div>
          </Case>
        </div>
      </Section>
    </div>
  )
}
