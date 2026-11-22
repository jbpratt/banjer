// The Web Audio engine: pre-rendered Karplus–Strong plucks (dsp.ts), cached per pitch and
// scheduled on the AudioContext clock. Rendering happens in workers (render.ts) when the
// platform has them, inline otherwise (Node tests, or a worker that failed).
import type { Midi } from '../domain/types.ts'
import { renderPluck } from './dsp.ts'
import { BACKGROUND, createWorkerRenderer, type PluckRenderer } from './render.ts'
import { TONE, type Variant } from './tone.ts'
import type { AudioEngine, AuditionOptions } from './types.ts'

/** Pitch range rendered in the background once the context exists. */
const WARM_RANGE = [48, 88] as const
/** The variant auditions use. */
const VARIANT: Variant = 'bright'
/** Render priorities: an audition waiting on a pitch, then prewarm(), then the background range. */
const NOW = 0
const SOON = 1
const LATER = BACKGROUND
/**
 * Sample rate for buffers rendered before there is a context. An AudioBuffer needs no
 * context and plays at any rate (the source node resamples), so the workers can warm the
 * neck while the page loads, not after the first tap. Most devices run at 48 kHz anyway.
 */
const DEFAULT_RATE = 48000
/** If the workers haven't delivered a waiting audition's pitches by now, render them inline. */
const STALL_MS = 250

export interface EngineOptions {
  /** Off-thread renderer; null renders inline. Default: a worker pool where Worker exists. */
  renderer?: PluckRenderer | null
}

interface Strum {
  midis: readonly Midi[]
  /** Seconds between strings. */
  gap: number
  /** Seconds after the batch's anchor. */
  delay: number
}

/** Auditions waiting on buffers. They play together, shifted by the same lateness. */
interface Batch {
  /** Context time of the first call; every strum is placed relative to it. */
  at: number
  strums: Strum[]
}

interface Bus {
  /** Everything sounding goes through here, so stop() can fade it all at once. */
  input: GainNode
  sources: Set<AudioScheduledSourceNode>
}

interface Graph {
  ctx: AudioContext
  mix: GainNode
  out: GainNode
  bus: Bus
}

interface Voice {
  src: AudioBufferSourceNode
  amp: GainNode
  start: number
  releaseAt: number
}


function stopAt(src: AudioScheduledSourceNode, time: number): void {
  try {
    src.stop(time)
  } catch {
    // Already stopped.
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function idle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 500 })
  else setTimeout(fn, 16)
}

export function createAudioEngine(opts: EngineOptions = {}): AudioEngine {
  const buffers = new Map<Midi, AudioBuffer>()
  const ringing = new Map<Midi, Voice>()
  /** Inline-render fallback queue, pumped in idle slices. */
  const warmQueue: Midi[] = []
  /** Inline-mode warm requests made before there is a context; rendering waits for one. */
  const wanted: Midi[] = []

  let renderer =
    opts.renderer !== undefined ? opts.renderer : typeof Worker === 'function' ? createWorkerRenderer() : null
  let graph: Graph | null = null
  let batch: Batch | null = null
  let volume = 1
  let warming = false
  let warmedRange = false

  // With workers, warm the neck as soon as the page is idle; the first tap then finds it ready.
  if (renderer) idle(warmRange)

  function warmRange(): void {
    if (warmedRange) return
    warmedRange = true
    const range: Midi[] = []
    for (let m = WARM_RANGE[0]; m <= WARM_RANGE[1]; m++) range.push(m)
    warm(range, LATER)
  }

  function rate(): number {
    return graph?.ctx.sampleRate ?? DEFAULT_RATE
  }

  function toBuffer(data: Float32Array<ArrayBuffer>, sampleRate: number): AudioBuffer {
    const b = graph
      ? graph.ctx.createBuffer(1, data.length, sampleRate)
      : new AudioBuffer({ numberOfChannels: 1, length: data.length, sampleRate })
    b.copyToChannel(data, 0)
    return b
  }

  function createBus(ctx: BaseAudioContext, mix: AudioNode): Bus {
    const input = ctx.createGain()
    input.connect(mix)
    return { input, sources: new Set() }
  }

  function ensureGraph(): Graph {
    if (graph) return graph
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    const { headroom, compressor: k } = TONE.mix
    const mix = ctx.createGain()
    mix.gain.value = headroom
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = k.thresholdDb
    comp.knee.value = k.kneeDb
    comp.ratio.value = k.ratio
    comp.attack.value = k.attack
    comp.release.value = k.release
    const out = ctx.createGain()
    out.gain.value = volume * volume
    mix.connect(comp).connect(out).connect(ctx.destination)
    const g: Graph = { ctx, mix, out, bus: createBus(ctx, mix) }
    graph = g
    warm(wanted.splice(0), SOON)
    warmRange()
    return g
  }

  function resume(ctx: AudioContext): void {
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  }

  /** The cached buffer, rendered inline on the main thread if it isn't there yet. */
  function buffer(midi: Midi): AudioBuffer {
    let b = buffers.get(midi)
    if (!b) {
      const sampleRate = rate()
      b = toBuffer(renderPluck(midi, VARIANT, sampleRate), sampleRate)
      buffers.set(midi, b)
    }
    return b
  }

  /** Ask the workers for a pitch; resolves (never rejects) once its buffer is cached. */
  function request(midi: Midi, priority: number): Promise<void> {
    const r = renderer
    if (buffers.has(midi) || !r) return Promise.resolve()
    const sampleRate = rate()
    return r.render(midi, VARIANT, sampleRate, priority).then(
      (samples) => {
        if (!buffers.has(midi)) buffers.set(midi, toBuffer(samples, sampleRate))
      },
      () => {
        // The workers are gone: render inline from here on.
        if (renderer === r) renderer = null
        if (priority === NOW) buffer(midi)
        else warm([midi], priority)
      },
    )
  }

  /** Render buffers ahead of need, without blocking the UI. */
  function warm(midis: Iterable<Midi>, priority: number): void {
    const todo = [...new Set(midis)].filter((m) => !buffers.has(m))
    if (renderer) {
      for (const m of todo) void request(m, priority)
      return
    }
    if (!graph) {
      wanted.push(...todo)
      return
    }
    // Inline fallback: one pitch per idle slice (a pitch can't be split), sooner ones first.
    if (priority < LATER) warmQueue.unshift(...todo)
    else warmQueue.push(...todo)
    if (warming || warmQueue.length === 0) return
    warming = true
    const pump = () => {
      const m = warmQueue.shift()
      if (m !== undefined) buffer(m)
      if (warmQueue.length > 0) idle(pump)
      else warming = false
    }
    idle(pump)
  }

  /** Schedule strums relative to `at` (context time). Every buffer must already be cached. */
  function play(g: Graph, at: number, strums: readonly Strum[]): void {
    const t0 = at + 0.01
    for (const s of strums) s.midis.forEach((midi, i) => playNote(g, t0 + s.delay + i * s.gap, midi))
  }

  /**
   * Wait for a batch's buffers, then play it. Starting a strum a few ms late but in time
   * beats starting on time and smearing the strings while each one renders.
   */
  async function settle(g: Graph, b: Batch): Promise<void> {
    const started = performance.now()
    for (;;) {
      const missing = [...new Set(b.strums.flatMap((s) => s.midis))].filter((m) => !buffers.has(m))
      if (missing.length === 0) break
      if (!renderer || performance.now() - started >= STALL_MS) {
        for (const m of missing) buffer(m)
        break
      }
      await Promise.race([Promise.all(missing.map((m) => request(m, NOW))), wait(STALL_MS)])
    }
    if (batch !== b) return // stop() dropped it.
    batch = null
    play(g, Math.max(b.at, g.ctx.currentTime), b.strums)
  }

  function release(v: Voice, at: number): void {
    if (at >= v.releaseAt) return
    const tau = TONE.damp.releaseMs / 1000 / 5
    v.amp.gain.cancelScheduledValues(at)
    v.amp.gain.setTargetAtTime(0, at, tau)
    stopAt(v.src, at + tau * 10)
    v.releaseAt = at
  }

  function playNote(g: Graph, time: number, midi: Midi): void {
    const { ctx, bus } = g
    // Only a clamp: play() already anchors after every buffer is ready.
    const t = Math.max(time, ctx.currentTime)
    const src = ctx.createBufferSource()
    src.buffer = buffer(midi)
    const amp = ctx.createGain()
    amp.gain.value = TONE.audition.gain
    src.connect(amp).connect(bus.input)
    // Re-sounding a pitch damps the one already ringing.
    const prev = ringing.get(midi)
    if (prev && prev.start <= t) release(prev, t)
    const voice: Voice = { src, amp, start: t, releaseAt: Infinity }
    src.start(t)
    ringing.set(midi, voice)
    bus.sources.add(src)
    src.onended = () => {
      bus.sources.delete(src)
      amp.disconnect()
      if (ringing.get(midi) === voice) ringing.delete(midi)
    }
  }

  function stop(): void {
    batch = null
    const g = graph
    if (!g) return
    ringing.clear()
    const { bus } = g
    if (bus.sources.size === 0) return
    const now = g.ctx.currentTime
    const fade = TONE.mix.stopFadeMs / 1000
    bus.input.gain.cancelScheduledValues(now)
    bus.input.gain.setValueAtTime(bus.input.gain.value, now)
    bus.input.gain.setTargetAtTime(0, now, fade / 8)
    for (const src of bus.sources) stopAt(src, now + fade)
    // Graph cleanup only; the sound itself is already scheduled on the audio clock.
    setTimeout(() => bus.input.disconnect(), fade * 1000 + 250)
    g.bus = createBus(g.ctx, g.mix)
  }

  return {
    async unlock() {
      const g = ensureGraph()
      if (g.ctx.state !== 'running') await g.ctx.resume()
    },

    audition(midis: readonly Midi[], opts: AuditionOptions = {}) {
      const g = ensureGraph()
      resume(g.ctx)
      const now = g.ctx.currentTime
      const strum: Strum = {
        midis: [...midis],
        gap: Math.max(0, opts.strumMs ?? 0) / 1000,
        delay: Math.max(0, opts.delayMs ?? 0) / 1000,
      }
      if (batch) {
        // Join the waiting batch so back-to-back comparisons keep their spacing.
        strum.delay += now - batch.at
        batch.strums.push(strum)
        return
      }
      if (midis.every((m) => buffers.has(m))) return play(g, now, [strum])
      if (!renderer) {
        // Inline: render everything first, then anchor, so the strum isn't smeared.
        for (const m of midis) buffer(m)
        return play(g, g.ctx.currentTime, [strum])
      }
      batch = { at: now, strums: [strum] }
      void settle(g, batch)
    },

    prewarm(midis: Iterable<Midi>) {
      warm(midis, SOON)
    },

    stop,

    setVolume(v) {
      if (!Number.isFinite(v)) return
      volume = Math.min(1, Math.max(0, v))
      // Squared taper: the slider's midpoint sounds roughly half as loud, not barely quieter.
      graph?.out.gain.setTargetAtTime(volume * volume, graph.ctx.currentTime, 0.015)
    },
  }
}
