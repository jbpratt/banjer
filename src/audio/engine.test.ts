// Wiring tests against a minimal fake of the Web Audio graph (Node has no AudioContext).
// The fake records what was scheduled; time is driven by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from './engine.ts'
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
  static last: FakeContext
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

let ctx: FakeContext

const notes = () => ctx.started

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('requestIdleCallback', () => 0)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('engine', () => {
  it('auditions now, strummed', () => {
    const engine = createAudioEngine()
    engine.audition([55, 59, 62], { strumMs: 20 })
    ctx = FakeContext.last
    expect(notes().map((n) => n.startAt)).toEqual([0.01, 0.03, 0.05].map((t) => expect.closeTo(t, 9)))
    expect(notes().every((n) => n.amp.gain.value === TONE.audition.gain)).toBe(true)
  })

  it('delays an audition on the audio clock', () => {
    const engine = createAudioEngine()
    engine.audition([55], { delayMs: 900 })
    ctx = FakeContext.last
    expect(notes().map((n) => n.startAt)).toEqual([expect.closeTo(0.91, 9)])
  })

  it('damps a pitch when it sounds again', () => {
    const engine = createAudioEngine()
    engine.audition([55])
    ctx = FakeContext.last
    ctx.currentTime = 0.5
    engine.audition([55])
    const [first] = notes()
    expect(first!.amp.gain.events.at(-1)).toMatchObject({ type: 'target', value: 0 })
    expect(first!.stopAt).toBeLessThan(1)
  })

  it('stops with a short fade', () => {
    const engine = createAudioEngine()
    engine.audition([55, 59, 62])
    ctx = FakeContext.last
    ctx.currentTime = 0.2
    engine.stop()
    const fade = TONE.mix.stopFadeMs / 1000
    expect(notes().every((s) => s.stopAt <= 0.2 + fade + 1e-9)).toBe(true)
  })
})
