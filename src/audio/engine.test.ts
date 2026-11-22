// Wiring tests against a minimal fake of the Web Audio graph (Node has no AudioContext).
// The fake records what was scheduled; time is driven by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Midi } from '../domain/types.ts'
import { createAudioEngine } from './engine.ts'
import type { PluckRenderer } from './render.ts'
import { TONE } from './tone.ts'

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
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'exp', value, time })
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
  playbackRate = new FakeParam(1)
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
  /** The gain node this source feeds. */
  get amp(): FakeGain {
    return this.out[0] as FakeGain
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
  /** Context seconds that pass per createBuffer call, to model a slow inline render. */
  renderCost = 0
  createBuffer(_channels: number, length: number) {
    this.currentTime += this.renderCost
    return { length, copyToChannel() {} }
  }
}

/** A renderer whose renders finish only when the test says so. */
function fakeRenderer() {
  const calls: { midi: Midi; priority: number; resolve: () => void; reject: () => void }[] = []
  const renderer: PluckRenderer = {
    start() {},
    render(midi, _variant, sampleRate, priority = 0) {
      return new Promise((resolve, reject) => {
        calls.push({ midi, priority, resolve: () => resolve({ samples: new Float32Array(8), sampleRate }), reject: () => reject(new Error('x')) })
      })
    },
  }
  const finish = async (midis?: Midi[]) => {
    for (const c of calls) if (!midis || midis.includes(c.midi)) c.resolve()
    await vi.advanceTimersByTimeAsync(0)
  }
  return { renderer, calls, finish }
}

const offsets = () => notes().map((n) => n.startAt - notes()[0]!.startAt)

let ctx: FakeContext

const notes = () => ctx.started

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

describe('engine', () => {
  it('auditions now, strummed', () => {
    const engine = createAudioEngine()
    engine.audition([55, 59, 62], { strumMs: 20 })
    ctx = FakeContext.last!
    expect(notes().map((n) => n.startAt)).toEqual([0.01, 0.03, 0.05].map((t) => expect.closeTo(t, 9)))
    expect(notes().every((n) => n.amp.gain.value === TONE.audition.gain)).toBe(true)
  })

  it('delays an audition on the audio clock', () => {
    const engine = createAudioEngine()
    engine.audition([55], { delayMs: 900 })
    ctx = FakeContext.last!
    expect(notes().map((n) => n.startAt)).toEqual([expect.closeTo(0.91, 9)])
  })

  it('damps a pitch when it sounds again', () => {
    const engine = createAudioEngine()
    engine.audition([55])
    ctx = FakeContext.last!
    ctx.currentTime = 0.5
    engine.audition([55])
    const [first] = notes()
    expect(first!.amp.gain.events.at(-1)).toMatchObject({ type: 'target', value: 0 })
    expect(first!.stopAt).toBeLessThan(1)
  })

  it('stops with a short fade', () => {
    const engine = createAudioEngine()
    engine.audition([55, 59, 62])
    ctx = FakeContext.last!
    ctx.currentTime = 0.2
    engine.stop()
    const fade = TONE.mix.stopFadeMs / 1000
    expect(notes().every((s) => s.stopAt <= 0.2 + fade + 1e-9)).toBe(true)
  })

  it('spaces a cold inline strum evenly, starting after the render', () => {
    const engine = createAudioEngine({ renderer: null })
    engine.prewarm([]) // no context yet: nothing to do
    engine.audition([48], {})
    ctx = FakeContext.last!
    ctx.started.length = 0
    ctx.renderCost = 0.02
    engine.audition([50, 55, 59, 62, 67], { strumMs: 30 })
    expect(offsets()).toEqual([0, 0.03, 0.06, 0.09, 0.12].map((t) => expect.closeTo(t, 9)))
    // Five inline renders took 0.1 s; the strum is anchored after them, not clamped note by note.
    expect(notes()[0]!.startAt).toBeCloseTo(0.11, 9)
  })

  it('waits for the workers, then strums in time', async () => {
    const { renderer, calls, finish } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.audition([50, 55, 59], { strumMs: 30 })
    ctx = FakeContext.last!
    expect(notes()).toHaveLength(0)
    const urgent = calls.filter((c) => c.priority === 0).map((c) => c.midi)
    expect(urgent).toEqual([50, 55, 59])
    ctx.currentTime = 0.04
    await finish([50, 55, 59])
    expect(notes().map((n) => n.startAt)).toEqual([0.05, 0.08, 0.11].map((t) => expect.closeTo(t, 9)))
  })

  it('keeps a comparison’s spacing while waiting', async () => {
    const { renderer, finish } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.audition([55, 59], { strumMs: 30 })
    engine.audition([55, 58], { strumMs: 30, delayMs: 900 })
    ctx = FakeContext.last!
    ctx.currentTime = 0.02
    await finish()
    expect(offsets()).toEqual([0, 0.03, 0.9, 0.93].map((t) => expect.closeTo(t, 9)))
  })

  it('drops a waiting audition on stop', async () => {
    const { renderer, finish } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.audition([55, 59])
    ctx = FakeContext.last!
    engine.stop()
    await finish()
    expect(notes()).toHaveLength(0)
  })

  it('renders inline when the workers fail', async () => {
    const { renderer, calls } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.audition([55, 59], { strumMs: 30 })
    ctx = FakeContext.last!
    for (const c of calls) c.reject()
    await vi.advanceTimersByTimeAsync(0)
    expect(offsets()).toEqual([0, 0.03].map((t) => expect.closeTo(t, 9)))
  })

  it('renders inline if the workers stall', async () => {
    const { renderer } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.audition([55])
    ctx = FakeContext.last!
    await vi.advanceTimersByTimeAsync(300)
    expect(notes()).toHaveLength(1)
  })

  it('prewarms on-screen pitches before any gesture, ahead of the background range', async () => {
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => setTimeout(fn, 0))
    vi.stubGlobal(
      'AudioBuffer',
      class {
        length: number
        constructor(o: { length: number }) {
          this.length = o.length
        }
        copyToChannel() {}
      },
    )
    const { renderer, calls, finish } = fakeRenderer()
    const engine = createAudioEngine({ renderer })
    engine.prewarm([62, 67])
    expect(calls.map((c) => [c.midi, c.priority])).toEqual([
      [62, 1],
      [67, 1],
    ])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls.filter((c) => c.priority === 2)).toHaveLength(88 - 48 + 1)
    expect(FakeContext.last).toBeUndefined() // still no context: no gesture yet
    await finish()
    // The first tap finds its pitches ready and sounds at once.
    engine.audition([62, 67], { strumMs: 30 })
    ctx = FakeContext.last!
    expect(notes().map((n) => n.startAt)).toEqual([0.01, 0.04].map((t) => expect.closeTo(t, 9)))
  })

  it('inline, waits for the context before prewarming', () => {
    const idle: (() => void)[] = []
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => idle.push(fn))
    const engine = createAudioEngine({ renderer: null })
    engine.prewarm([62])
    expect(idle).toHaveLength(0)
    void engine.unlock()
    expect(idle).toHaveLength(1)
  })
})
