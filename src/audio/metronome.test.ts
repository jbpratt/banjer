import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from './engine.ts'
import { initialPlan, planTicks, renderClick, withUpdate, type PlanState, type PlannedTick } from './metronome.ts'
import { TONE } from './tone.ts'
import type { MetronomeConfig, Tick } from './types.ts'

const cfg = (c: Partial<MetronomeConfig> = {}): MetronomeConfig => ({
  bpm: 120,
  beatsPerBar: 4,
  subdivision: 1,
  accent: true,
  ...c,
})

const gaps = (ticks: PlannedTick[]) => ticks.slice(1).map((t, i) => t.time - ticks[i]!.time)
const close = (xs: number[]) => xs.map((x) => expect.closeTo(x, 9))

/** Plan in steps the way the scheduler does, collecting every booked click. */
function run(state: PlanState, from: number, to: number, step = 0.025) {
  const ticks: PlannedTick[] = []
  let s = state
  for (let now = from; now < to - 1e-9; now += step) {
    const r = planTicks(s, now, now + 0.12)
    ticks.push(...r.ticks)
    s = r.state
  }
  return { ticks, state: s }
}

describe('planTicks', () => {
  it('spaces quarter notes at the tempo', () => {
    const { ticks } = planTicks(initialPlan(cfg({ bpm: 120 }), 1), 1, 3)
    expect(ticks.map((t) => t.time)).toEqual(close([1, 1.5, 2, 2.5]))
    expect(ticks.map((t) => t.beat)).toEqual([0, 1, 2, 3])
    expect(ticks.every((t) => t.sub === 0)).toBe(true)
  })

  it('stays on the grid when planned in small steps', () => {
    const { ticks } = run(initialPlan(cfg({ bpm: 100 }), 0.05), 0, 5)
    expect(gaps(ticks)).toEqual(close(Array(gaps(ticks).length).fill(0.6)))
    expect(ticks[0]!.time).toBeCloseTo(0.05, 9)
  })

  it('clicks eighths, softer off the beat', () => {
    const { ticks } = planTicks(initialPlan(cfg({ bpm: 60, beatsPerBar: 2, subdivision: 2 }), 0), 0, 2.5)
    expect(ticks.map((t) => t.time)).toEqual(close([0, 0.5, 1, 1.5, 2]))
    expect(ticks.map((t) => [t.beat, t.sub])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [0, 0],
    ])
    expect(ticks.map((t) => t.kind)).toEqual(['accent', 'sub', 'beat', 'sub', 'accent'])
  })

  it('accents beat 1 only when enabled', () => {
    const on = planTicks(initialPlan(cfg({ beatsPerBar: 3 }), 0), 0, 3).ticks.map((t) => t.kind)
    expect(on).toEqual(['accent', 'beat', 'beat', 'accent', 'beat', 'beat'])
    const off = planTicks(initialPlan(cfg({ beatsPerBar: 3, accent: false }), 0), 0, 3).ticks.map((t) => t.kind)
    expect(off.every((k) => k === 'beat')).toBe(true)
  })

  it('clamps tempo and meter', () => {
    expect(initialPlan(cfg({ bpm: 1000, beatsPerBar: 9 }), 0).config).toMatchObject({ bpm: 240, beatsPerBar: 4 })
    expect(initialPlan(cfg({ bpm: 1, beatsPerBar: 1 }), 0).config).toMatchObject({ bpm: 40, beatsPerBar: 2 })
    expect(initialPlan(cfg({ bpm: NaN }), 0).config.bpm).toBeGreaterThanOrEqual(40)
  })

  it('applies a tempo change mid-bar from the next click', () => {
    // 120 bpm: clicks at 0, 0.5, 1.0 booked; change to 60 bpm before the next one.
    let r = planTicks(initialPlan(cfg({ bpm: 120 }), 0), 0, 1.1)
    expect(r.ticks.map((t) => t.time)).toEqual(close([0, 0.5, 1]))
    r = planTicks(withUpdate(r.state, cfg({ bpm: 60 })), 1.1, 4.1)
    expect(r.ticks.map((t) => t.time)).toEqual(close([2, 3, 4]))
    // The beat count carries on: beat 3 of the bar, then beat 1.
    expect(r.ticks.map((t) => t.beat)).toEqual([3, 0, 1])
  })

  it('speeding up late in a gap clicks now instead of skipping beats', () => {
    // 60 bpm, beat 1 at 0; at 0.9 the tempo jumps to 200 (the next click would be at 0.3).
    let r = planTicks(initialPlan(cfg({ bpm: 60 }), 0), 0, 0.12)
    r = planTicks(withUpdate(r.state, cfg({ bpm: 200 })), 0.9, 1.5)
    expect(r.ticks.map((t) => t.time)).toEqual(close([0.9, 1.2]))
    expect(r.ticks.map((t) => t.beat)).toEqual([1, 2])
  })

  it('waits for the bar line to change meter', () => {
    let r = planTicks(initialPlan(cfg({ bpm: 60, beatsPerBar: 4 }), 0), 0, 1.5) // beats 0, 1
    r = planTicks(withUpdate(r.state, cfg({ bpm: 60, beatsPerBar: 3 })), 1.5, 10.5)
    expect(r.ticks.map((t) => t.beat)).toEqual([2, 3, 0, 1, 2, 0, 1, 2, 0])
    expect(r.state.pending).toBeNull()
  })

  it('changes subdivision at the next beat, not mid-beat', () => {
    let r = planTicks(initialPlan(cfg({ bpm: 60, subdivision: 2 }), 0), 0, 0.6) // beat 0 sub 0, sub 1
    r = planTicks(withUpdate(r.state, cfg({ bpm: 60, subdivision: 1 })), 0.6, 3.5)
    expect(r.ticks.map((t) => [t.time, t.beat, t.sub])).toEqual([
      [1, 1, 0],
      [2, 2, 0],
      [3, 3, 0],
    ])
  })

  it('skips forward after a long stall instead of bursting', () => {
    let r = planTicks(initialPlan(cfg({ bpm: 120 }), 0), 0, 0.12)
    expect(r.ticks).toHaveLength(1)
    // The timer slept for 10 s (backgrounded tab).
    r = planTicks(r.state, 10.03, 10.15)
    expect(r.ticks).toEqual([])
    r = planTicks(r.state, 10.4, 10.52)
    // Back on the original grid, with the beat count as if nothing was missed (beat 21 → 1).
    expect(r.ticks.map((t) => [t.time, t.beat])).toEqual([[expect.closeTo(10.5, 9), 1]])
  })
})

describe('renderClick', () => {
  for (const kind of ['accent', 'beat', 'sub'] as const) {
    it(`renders a short, bounded, decaying ${kind} click`, () => {
      const rate = 48000
      const x = renderClick(kind, rate)
      expect(x.length).toBe(Math.round((TONE.metronome.lengthMs / 1000) * rate))
      const peak = Math.max(...x.map(Math.abs))
      expect(peak).toBeLessThanOrEqual(0.9 + 1e-6)
      expect(peak).toBeCloseTo(TONE.metronome[kind].gain, 5)
      const energy = (a: number, b: number) => x.slice(a, b).reduce((s, v) => s + v * v, 0)
      const q = Math.floor(x.length / 4)
      expect(energy(3 * q, x.length)).toBeLessThan(energy(0, q) * 1e-3)
      expect(x[x.length - 1]).toBeCloseTo(0, 9)
    })
  }

  it('makes the accent louder than the beat, and the beat louder than the sub', () => {
    const peak = (k: 'accent' | 'beat' | 'sub') => Math.max(...renderClick(k, 44100).map(Math.abs))
    expect(peak('accent')).toBeGreaterThan(peak('beat'))
    expect(peak('beat')).toBeGreaterThan(peak('sub'))
  })
})

// Wiring against a minimal fake of the Web Audio graph, as in engine.test.ts.
class FakeParam {
  events: { type: string; value: number; time: number }[] = []
  constructor(public value: number) {}
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time })
    return this
  }
  setTargetAtTime(value: number, time: number) {
    this.events.push({ type: 'target', value, time })
    return this
  }
  cancelScheduledValues(time: number) {
    this.events = this.events.filter((e) => e.time < time)
    return this
  }
}

class FakeNode {
  out: FakeNode[] = []
  connect<T extends FakeNode>(node: T): T {
    this.out.push(node)
    return node
  }
  disconnect() {
    this.out = []
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1)
}

class FakeSource extends FakeNode {
  buffer: { length: number } | null = null
  startAt = NaN
  stopAt = Infinity
  onended: (() => void) | null = null
  constructor(private ctx: FakeContext) {
    super()
  }
  start(time: number) {
    this.startAt = time
    this.ctx.started.push(this)
  }
  stop(time = this.ctx.currentTime) {
    this.stopAt = time
  }
}

class FakeContext {
  static last: FakeContext | undefined
  currentTime = 0
  sampleRate = 48000
  state = 'running'
  baseLatency = 0.01
  outputLatency = 0.02
  destination = new FakeNode()
  started: FakeSource[] = []
  constructor() {
    FakeContext.last = this
  }
  resume() {
    return Promise.resolve()
  }
  createGain() {
    return new FakeGain()
  }
  createBufferSource() {
    return new FakeSource(this)
  }
  createDynamicsCompressor() {
    const c = new FakeNode() as FakeNode & Record<string, FakeParam>
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) c[k] = new FakeParam(0)
    return c
  }
  createBuffer(_channels: number, length: number) {
    return { length, copyToChannel() {} }
  }
}

/** Advance the audio clock and the timers together. */
async function advance(ctx: FakeContext, ms: number) {
  for (let t = 0; t < ms; t += 5) {
    ctx.currentTime += 0.005
    await vi.advanceTimersByTimeAsync(5)
  }
}

describe('metronome wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', FakeContext)
    vi.stubGlobal('requestIdleCallback', () => 0)
  })

  afterEach(() => {
    FakeContext.last = undefined
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('books clicks on the audio clock, ahead of time', async () => {
    const engine = createAudioEngine({ renderer: null })
    engine.metronome.start(cfg({ bpm: 120 }))
    const ctx = FakeContext.last!
    expect(engine.metronome.isRunning()).toBe(true)
    expect(ctx.started.map((s) => s.startAt)).toEqual(close([0.05]))
    await advance(ctx, 1000)
    expect(ctx.started.map((s) => s.startAt)).toEqual(close([0.05, 0.55, 1.05]))
  })

  it('reports ticks around when they are heard, and null on stop', async () => {
    const engine = createAudioEngine({ renderer: null })
    const seen: (Tick | null)[] = []
    const off = engine.metronome.onTick((t) => seen.push(t))
    engine.metronome.start(cfg({ bpm: 120 }))
    const ctx = FakeContext.last!
    // First click at 0.05 s plus 0.02 s output latency.
    await vi.advanceTimersByTimeAsync(60)
    expect(seen).toEqual([])
    await vi.advanceTimersByTimeAsync(15)
    expect(seen).toEqual([{ beat: 0, sub: 0 }])
    ctx.currentTime = 0.4
    await advance(ctx, 100) // books the 0.55 click
    engine.metronome.stop()
    await vi.advanceTimersByTimeAsync(500)
    expect(seen).toEqual([{ beat: 0, sub: 0 }, null])
    off()
  })

  it('keeps clicking through engine.stop(), and stops future clicks on its own stop()', async () => {
    const engine = createAudioEngine({ renderer: null })
    engine.metronome.start(cfg({ bpm: 120 }))
    const ctx = FakeContext.last!
    ctx.currentTime = 0.45
    await advance(ctx, 30) // books 0.55
    const booked = [...ctx.started]
    engine.audition([55])
    engine.stop()
    expect(booked.every((s) => s.stopAt === Infinity)).toBe(true)
    await advance(ctx, 1000) // to 1.48 s: the 1.55 click is booked, not yet heard
    expect(ctx.started.length).toBeGreaterThan(booked.length)

    const now = ctx.currentTime
    const clicks = ctx.started.filter((s) => s.buffer?.length === renderClick('beat', 48000).length)
    engine.metronome.stop()
    expect(engine.metronome.isRunning()).toBe(false)
    const fade = TONE.metronome.stopFadeMs / 1000
    const future = clicks.filter((s) => s.startAt > now)
    expect(future.length).toBeGreaterThan(0)
    expect(future.every((s) => s.stopAt <= now + fade + 1e-9)).toBe(true)
    const count = ctx.started.length
    await advance(ctx, 500)
    expect(ctx.started.length).toBe(count)
  })

  it('ignores update() when stopped and restarts from beat 1', async () => {
    const engine = createAudioEngine({ renderer: null })
    const seen: (Tick | null)[] = []
    engine.metronome.onTick((t) => seen.push(t))
    engine.metronome.update(cfg())
    expect(engine.metronome.isRunning()).toBe(false)
    engine.metronome.start(cfg({ bpm: 240 }))
    const ctx = FakeContext.last!
    await advance(ctx, 400)
    engine.metronome.start(cfg({ bpm: 240 }))
    seen.length = 0
    await advance(ctx, 120)
    expect(seen[0]).toEqual({ beat: 0, sub: 0 })
  })
})
