// The Web Audio engine: pre-rendered Karplus–Strong plucks (dsp.ts), cached per pitch and
// scheduled on the AudioContext clock.
import type { Midi } from '../domain/types.ts'
import { renderPluck } from './dsp.ts'
import { TONE, type Variant } from './tone.ts'
import type { AudioEngine, AuditionOptions } from './types.ts'

/** Pitch range rendered in the background on unlock(). */
const WARM_RANGE = [48, 88] as const
/** The variant auditions use. */
const VARIANT: Variant = 'bright'

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

function toBuffer(ctx: BaseAudioContext, data: Float32Array<ArrayBuffer>): AudioBuffer {
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate)
  buffer.copyToChannel(data, 0)
  return buffer
}

function stopAt(src: AudioScheduledSourceNode, time: number): void {
  try {
    src.stop(time)
  } catch {
    // Already stopped.
  }
}

function idle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 500 })
  else setTimeout(fn, 16)
}

export function createAudioEngine(): AudioEngine {
  const buffers = new Map<Midi, AudioBuffer>()
  const ringing = new Map<Midi, Voice>()
  const warmQueue: Midi[] = []

  let graph: Graph | null = null
  let volume = 1
  let warming = false
  let warmedRange = false

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
    graph = { ctx, mix, out, bus: createBus(ctx, mix) }
    return graph
  }

  function resume(ctx: AudioContext): void {
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  }

  function buffer(g: Graph, midi: Midi): AudioBuffer {
    let b = buffers.get(midi)
    if (!b) {
      b = toBuffer(g.ctx, renderPluck(midi, VARIANT, g.ctx.sampleRate))
      buffers.set(midi, b)
    }
    return b
  }

  /** Render buffers in idle slices so the UI never waits. */
  function warm(g: Graph, midis: Iterable<Midi>): void {
    warmQueue.push(...[...midis].filter((m) => !buffers.has(m)))
    if (warming || warmQueue.length === 0) return
    warming = true
    const pump = () => {
      const until = performance.now() + 8
      while (warmQueue.length > 0 && performance.now() < until) buffer(g, warmQueue.shift()!)
      if (warmQueue.length > 0) idle(pump)
      else warming = false
    }
    idle(pump)
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
    const t = Math.max(time, ctx.currentTime)
    const src = ctx.createBufferSource()
    src.buffer = buffer(g, midi)
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
      if (!warmedRange) {
        warmedRange = true
        const midis: Midi[] = []
        for (let m = WARM_RANGE[0]; m <= WARM_RANGE[1]; m++) midis.push(m)
        warm(g, midis)
      }
      if (g.ctx.state !== 'running') await g.ctx.resume()
    },

    audition(midis: readonly Midi[], opts: AuditionOptions = {}) {
      const g = ensureGraph()
      resume(g.ctx)
      const gap = Math.max(0, opts.strumMs ?? 0) / 1000
      const t0 = g.ctx.currentTime + 0.01 + Math.max(0, opts.delayMs ?? 0) / 1000
      midis.forEach((midi, i) => playNote(g, t0 + i * gap, midi))
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
