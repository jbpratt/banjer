// Off-main-thread pluck rendering: a small pool of module workers running dsp.ts.
// One low note costs 15-60 ms of CPU; on the main thread that is a dropped frame per note
// and a late, ragged first strum.
import type { Midi } from '../domain/types.ts'
import type { Variant } from './tone.ts'

export interface RenderRequest {
  id: number
  midi: Midi
  variant: Variant
  sampleRate: number
}

export type RenderReply = { id: number; samples: Float32Array<ArrayBuffer> } | { id: number; error: string }

/** Renders plucks asynchronously. The engine falls back to rendering inline without one. */
export interface PluckRenderer {
  /**
   * Render one pluck. Lower `priority` renders first; equal priorities go in request order.
   * A repeat request for a queued pitch returns the same promise and can raise its priority.
   * Rejects if the workers die.
   */
  render(midi: Midi, variant: Variant, sampleRate: number, priority?: number): Promise<Float32Array<ArrayBuffer>>
  /** Spawn the workers ahead of first use, so the first gesture doesn't pay for it. */
  start(): void
}

/** Jobs at this priority or lower (later) are background warm-up. */
export const BACKGROUND = 2

interface Job extends RenderRequest {
  key: string
  priority: number
  promise: Promise<Float32Array<ArrayBuffer>>
  resolve(samples: Float32Array<ArrayBuffer>): void
  reject(err: Error): void
}

interface Slot {
  worker: Worker
  job: Job | null
}

/** One worker per spare core, up to three: enough to render a five-string strum in parallel. */
function poolSize(): number {
  const cores = typeof navigator === 'undefined' ? 2 : navigator.hardwareConcurrency || 2
  return Math.min(3, Math.max(1, cores - 1))
}

export function createWorkerRenderer(size = poolSize()): PluckRenderer {
  const slots: Slot[] = []
  const queue: Job[] = []
  const jobs = new Map<string, Job>()
  let nextId = 1
  let dead: Error | null = null

  function fail(err: Error): void {
    dead = err
    for (const s of slots) s.worker.terminate()
    slots.length = 0
    queue.length = 0
    for (const job of jobs.values()) job.reject(err)
    jobs.clear()
  }

  function start(): void {
    if (dead || slots.length > 0) return
    try {
      for (let i = 0; i < size; i++) {
        const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })
        const slot: Slot = { worker, job: null }
        worker.onmessage = (e: MessageEvent<RenderReply>) => {
          const job = slot.job
          slot.job = null
          if (job && job.id === e.data.id) {
            jobs.delete(job.key)
            if ('samples' in e.data) job.resolve(e.data.samples)
            else job.reject(new Error(e.data.error))
          }
          pump()
        }
        worker.onerror = (e) => fail(new Error(`render worker: ${e.message}`))
        worker.onmessageerror = () => fail(new Error('render worker: bad message'))
        slots.push(slot)
      }
    } catch (e) {
      fail(e instanceof Error ? e : new Error(String(e)))
    }
  }

  function enqueue(job: Job): void {
    const i = queue.findIndex((j) => j.priority > job.priority)
    if (i < 0) queue.push(job)
    else queue.splice(i, 0, job)
  }

  function pump(): void {
    for (const slot of slots) {
      if (slot.job) continue
      const job = queue[0]
      if (!job) return
      // Background work gets one worker, so the rest are free the moment a tap needs a
      // pitch: a low note in flight can take 60 ms on a slow phone.
      const background = slots.filter((s) => s.job && s.job.priority >= BACKGROUND).length
      if (job.priority >= BACKGROUND && background >= Math.max(1, slots.length - 2)) return
      queue.shift()
      slot.job = job
      const { id, midi, variant, sampleRate } = job
      slot.worker.postMessage({ id, midi, variant, sampleRate } satisfies RenderRequest)
    }
  }

  return {
    start,
    render(midi, variant, sampleRate, priority = 0) {
      start()
      if (dead) return Promise.reject(dead)
      const key = `${variant}:${sampleRate}:${midi}`
      let job = jobs.get(key)
      if (job) {
        const i = queue.indexOf(job)
        if (i >= 0 && priority < job.priority) {
          queue.splice(i, 1)
          job.priority = priority
          enqueue(job)
          pump()
        }
        return job.promise
      }
      let resolve!: Job['resolve']
      let reject!: Job['reject']
      const promise = new Promise<Float32Array<ArrayBuffer>>((res, rej) => {
        resolve = res
        reject = rej
      })
      job = { id: nextId++, midi, variant, sampleRate, key, priority, promise, resolve, reject }
      jobs.set(key, job)
      enqueue(job)
      pump()
      return promise
    },
  }
}
