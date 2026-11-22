// The worker pool's queueing, against a fake Worker (Node has none).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkerRenderer, type RenderReply, type RenderRequest } from './render.ts'

class FakeWorker {
  static all: FakeWorker[] = []
  posted: RenderRequest[] = []
  onmessage: ((e: { data: RenderReply }) => void) | null = null
  onerror: ((e: { message: string }) => void) | null = null
  onmessageerror: (() => void) | null = null
  terminated = false
  constructor() {
    FakeWorker.all.push(this)
  }
  postMessage(msg: RenderRequest) {
    this.posted.push(msg)
  }
  terminate() {
    this.terminated = true
  }
  /** Finish the job in flight. */
  reply() {
    const { id } = this.posted.at(-1)!
    this.onmessage?.({ data: { id, samples: new Float32Array(4) } })
  }
}

const midis = (w: FakeWorker) => w.posted.map((p) => p.midi)

beforeEach(() => {
  FakeWorker.all = []
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('worker renderer', () => {
  it('renders by priority, then request order, one job per worker', async () => {
    const r = createWorkerRenderer(1)
    void r.render(48, 'bright', 48000, 2)
    void r.render(49, 'bright', 48000, 2)
    void r.render(62, 'bright', 48000, 1)
    void r.render(55, 'bright', 48000, 0)
    const done = r.render(59, 'bright', 48000, 0)
    const [w] = FakeWorker.all
    expect(midis(w!)).toEqual([48]) // already in flight before the others arrived
    for (let i = 0; i < 4; i++) w!.reply()
    expect(midis(w!)).toEqual([48, 55, 59, 62, 49])
    await expect(done).resolves.toMatchObject({ samples: expect.any(Float32Array), sampleRate: 48000 })
  })

  it('keeps workers free of background work for taps', () => {
    const r = createWorkerRenderer(3)
    for (let m = 48; m < 52; m++) void r.render(m, 'bright', 48000, 2)
    expect(FakeWorker.all.map(midis)).toEqual([[48], [], []])
    void r.render(62, 'bright', 48000, 1)
    void r.render(67, 'bright', 48000, 0)
    expect(FakeWorker.all.map(midis)).toEqual([[48], [62], [67]])
  })

  it('dispatches a promoted background pitch to a free worker at once', () => {
    const r = createWorkerRenderer(3)
    for (let m = 48; m < 52; m++) void r.render(m, 'bright', 48000, 2)
    void r.render(50, 'bright', 48000, 0)
    expect(FakeWorker.all.map(midis)).toEqual([[48], [50], []])
  })

  it('dedupes and promotes a queued pitch', () => {
    const r = createWorkerRenderer(1)
    void r.render(48, 'bright', 48000, 2)
    const a = r.render(50, 'bright', 48000, 2)
    void r.render(52, 'bright', 48000, 2)
    const b = r.render(52, 'bright', 48000, 0)
    expect(b).not.toBe(a)
    expect(r.render(50, 'bright', 48000, 2)).toBe(a)
    FakeWorker.all[0]!.reply()
    expect(midis(FakeWorker.all[0]!)).toEqual([48, 52])
  })

  it('reuses a pitch queued at another rate, and reports the rate it rendered at', async () => {
    const r = createWorkerRenderer(1)
    void r.render(48, 'bright', 48000, 2)
    const warm = r.render(50, 'bright', 48000, 2)
    const tap = r.render(50, 'bright', 44100, 0)
    expect(tap).toBe(warm)
    const [w] = FakeWorker.all
    w!.reply()
    w!.reply()
    expect(midis(w!)).toEqual([48, 50])
    await expect(tap).resolves.toMatchObject({ sampleRate: 48000 })
  })

  it('rejects everything when a worker dies', async () => {
    const r = createWorkerRenderer(2)
    const a = r.render(48, 'bright', 48000)
    const b = r.render(50, 'bright', 48000)
    const c = r.render(52, 'bright', 48000)
    FakeWorker.all[1]!.onerror?.({ message: 'boom' })
    await expect(Promise.allSettled([a, b, c])).resolves.toMatchObject([
      { status: 'rejected' },
      { status: 'rejected' },
      { status: 'rejected' },
    ])
    expect(FakeWorker.all.every((w) => w.terminated)).toBe(true)
    await expect(r.render(55, 'bright', 48000)).rejects.toThrow('boom')
  })
})
