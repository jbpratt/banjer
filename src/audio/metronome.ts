// The click track. A lookahead scheduler: a timer wakes every few ms and books every click
// due in the next ~120 ms on the AudioContext clock. The timer never decides when a click
// sounds; it only makes sure clicks are booked in time. The plan itself (planTicks) and the
// click sound (renderClick) are pure, so tests run in Node.
import { TONE } from './tone.ts'
import { METRONOME_BPM, type Metronome, type MetronomeConfig, type Tick } from './types.ts'

/** How often the scheduler wakes, ms. */
const WAKE_MS = 25
/** How far ahead clicks are booked, seconds. Must comfortably exceed WAKE_MS plus timer jitter. */
const LOOKAHEAD = 0.12
/** The first click, seconds after start(). */
const START_OFFSET = 0.05

export type ClickKind = 'accent' | 'beat' | 'sub'

/** A click to book. */
export interface PlannedTick extends Tick {
  /** Context time, seconds. */
  time: number
  kind: ClickKind
}

/** Where the scheduler is. Owned by the caller; planTicks never mutates it. */
export interface PlanState {
  /** Context time of the last booked (or skipped) click; null before the first. */
  last: number | null
  /** Context time of the first click, used while `last` is null. */
  start: number
  /** Beat and subdivision of the next click. */
  beat: number
  sub: number
  /** The config in effect. */
  config: MetronomeConfig
  /** A config from update() not yet fully adopted: tempo and accent at the next click, subdivision at the next beat, meter at the next bar line. */
  pending: MetronomeConfig | null
}

/** Clamp a config to what the metronome supports. */
export function normalizeConfig(c: MetronomeConfig): MetronomeConfig {
  const bpm = Number.isFinite(c.bpm) ? Math.min(METRONOME_BPM.max, Math.max(METRONOME_BPM.min, c.bpm)) : 100
  const beats = Number.isFinite(c.beatsPerBar) ? Math.min(4, Math.max(2, Math.round(c.beatsPerBar))) : 4
  return { bpm, beatsPerBar: beats, subdivision: c.subdivision === 2 ? 2 : 1, accent: !!c.accent }
}

/** A fresh plan that clicks beat 1 at `start`. */
export function initialPlan(config: MetronomeConfig, start: number): PlanState {
  return { last: null, start, beat: 0, sub: 0, config: normalizeConfig(config), pending: null }
}

/** Queue a config change; planTicks adopts each part at its boundary. */
export function withUpdate(state: PlanState, config: MetronomeConfig): PlanState {
  return { ...state, pending: normalizeConfig(config) }
}

function kindOf(config: MetronomeConfig, beat: number, sub: number): ClickKind {
  if (sub !== 0) return 'sub'
  return config.accent && beat === 0 ? 'accent' : 'beat'
}

/** The next click's time and the config it plays under. Does not advance anything. */
function peek(s: PlanState, now: number): { time: number; config: MetronomeConfig; pending: MetronomeConfig | null } {
  const p = s.pending
  // The gap before this click: the new tempo, but the old subdivision (it belongs to the beat
  // that is ending).
  const bpm = p ? p.bpm : s.config.bpm
  let time = s.last === null ? s.start : s.last + 60 / bpm / s.config.subdivision
  // Speeding up can put the next click in the past; play it now rather than skip it as a stall.
  if (p && p.bpm !== s.config.bpm) time = Math.max(time, now)
  if (!p) return { time, config: s.config, pending: null }
  const onBeat = s.sub === 0
  const onBar = onBeat && s.beat === 0
  const config: MetronomeConfig = {
    bpm: p.bpm,
    accent: p.accent,
    subdivision: onBeat ? p.subdivision : s.config.subdivision,
    beatsPerBar: onBar ? p.beatsPerBar : s.config.beatsPerBar,
  }
  const done = config.subdivision === p.subdivision && config.beatsPerBar === p.beatsPerBar
  return { time, config, pending: done ? null : p }
}

/**
 * Plan clicks up to (not including) `until`, all on the context clock. Clicks already in the
 * past (`< now`, e.g. after the tab was backgrounded and the timer stalled) are skipped, not
 * burst out late; the grid and the beat count carry on as if they had played.
 */
export function planTicks(state: PlanState, now: number, until: number): { ticks: PlannedTick[]; state: PlanState } {
  const ticks: PlannedTick[] = []
  let s = state
  for (;;) {
    const { time, config, pending } = peek(s, now)
    if (time >= until) break
    if (time >= now) ticks.push({ time, beat: s.beat, sub: s.sub, kind: kindOf(config, s.beat, s.sub) })
    let beat = s.beat
    let sub = s.sub + 1
    if (sub >= config.subdivision) {
      sub = 0
      beat = (beat + 1) % config.beatsPerBar
    }
    s = { last: time, start: s.start, beat, sub, config, pending }
  }
  return { ticks, state: s }
}

/** One click, peak `TONE.metronome[kind].gain`. A damped sine with a faint inharmonic partial. */
export function renderClick(kind: ClickKind, sampleRate: number): Float32Array<ArrayBuffer> {
  const { hz, gain } = TONE.metronome[kind]
  const { overtone, decayMs, attackMs, lengthMs } = TONE.metronome
  const n = Math.max(1, Math.round((lengthMs / 1000) * sampleRate))
  const out = new Float32Array(n)
  const tau = (decayMs / 1000) * sampleRate
  const attack = Math.max(1, (attackMs / 1000) * sampleRate)
  const w1 = (2 * Math.PI * hz) / sampleRate
  const w2 = Math.min(w1 * overtone.ratio, 0.9 * Math.PI)
  // The tail fade: the last fifth of the buffer, so the end is exactly silent.
  const tail = Math.max(1, Math.floor(n / 5))
  let peak = 0
  for (let i = 0; i < n; i++) {
    const env = Math.exp(-i / tau)
    const a = i < attack ? 0.5 - 0.5 * Math.cos((Math.PI * i) / attack) : 1
    const t = n - 1 - i < tail ? (n - 1 - i) / tail : 1
    const v = env * a * t * (Math.sin(w1 * i) + overtone.level * Math.sin(w2 * i))
    out[i] = v
    peak = Math.max(peak, Math.abs(v))
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = (out[i]! / peak) * gain
  return out
}

/** What the metronome needs from the engine: its context and the node feeding the master mix. */
export interface MetronomeGraph {
  ctx: AudioContext
  destination: AudioNode
}

interface Bus {
  input: GainNode
  sources: Set<AudioBufferSourceNode>
}

function stopAt(src: AudioScheduledSourceNode, time: number): void {
  try {
    src.stop(time)
  } catch {
    // Already stopped.
  }
}

/** The click track. `graph` is called lazily, on the first start(). */
export function createMetronome(graph: () => MetronomeGraph): Metronome {
  const listeners = new Set<(tick: Tick | null) => void>()
  const tickTimers = new Set<ReturnType<typeof setTimeout>>()
  let buffers: { rate: number; byKind: Map<ClickKind, AudioBuffer> } | null = null
  let bus: Bus | null = null
  let plan: PlanState | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  function emit(tick: Tick | null): void {
    // One broken listener must not starve the others (or throw out of stop()).
    for (const fn of listeners) {
      try {
        fn(tick)
      } catch (e) {
        console.error(e)
      }
    }
  }

  function buffer(ctx: AudioContext, kind: ClickKind): AudioBuffer {
    if (!buffers || buffers.rate !== ctx.sampleRate) buffers = { rate: ctx.sampleRate, byKind: new Map() }
    let b = buffers.byKind.get(kind)
    if (!b) {
      const data = renderClick(kind, ctx.sampleRate)
      b = ctx.createBuffer(1, data.length, ctx.sampleRate)
      b.copyToChannel(data, 0)
      buffers.byKind.set(kind, b)
    }
    return b
  }

  function ensureBus(g: MetronomeGraph): Bus {
    if (bus) return bus
    const input = g.ctx.createGain()
    input.gain.value = TONE.metronome.gain
    input.connect(g.destination)
    bus = { input, sources: new Set() }
    return bus
  }

  function book(g: MetronomeGraph, b: Bus, t: PlannedTick): void {
    const { ctx } = g
    const src = ctx.createBufferSource()
    src.buffer = buffer(ctx, t.kind)
    src.connect(b.input)
    src.start(t.time)
    b.sources.add(src)
    src.onended = () => {
      b.sources.delete(src)
      src.disconnect()
    }
    // Visual only: the light lands about when the click reaches the speakers.
    const latency = ctx.outputLatency || ctx.baseLatency || 0
    const ms = Math.max(0, (t.time - ctx.currentTime + latency) * 1000)
    const tick: Tick = { beat: t.beat, sub: t.sub }
    const id = setTimeout(() => {
      tickTimers.delete(id)
      emit(tick)
    }, ms)
    tickTimers.add(id)
  }

  function schedule(): void {
    if (!plan) return
    const g = graph()
    const b = ensureBus(g)
    const now = g.ctx.currentTime
    const { ticks, state } = planTicks(plan, now, now + LOOKAHEAD)
    plan = state
    for (const t of ticks) book(g, b, t)
  }

  /** Silence everything booked and forget the plan. */
  function halt(): void {
    if (timer !== null) clearInterval(timer)
    timer = null
    plan = null
    for (const id of tickTimers) clearTimeout(id)
    tickTimers.clear()
    const b = bus
    if (!b) return
    bus = null
    const { ctx } = graph()
    const now = ctx.currentTime
    const fade = TONE.metronome.stopFadeMs / 1000
    b.input.gain.cancelScheduledValues(now)
    b.input.gain.setValueAtTime(b.input.gain.value, now)
    b.input.gain.setTargetAtTime(0, now, fade / 8)
    for (const src of b.sources) stopAt(src, now + fade)
    setTimeout(() => b.input.disconnect(), fade * 1000 + 250)
  }

  return {
    start(config) {
      halt()
      const g = graph()
      if (g.ctx.state !== 'running') void g.ctx.resume().catch(() => {})
      plan = initialPlan(config, g.ctx.currentTime + START_OFFSET)
      schedule()
      timer = setInterval(schedule, WAKE_MS)
    },

    update(config) {
      if (plan) plan = withUpdate(plan, config)
    },

    stop() {
      const wasRunning = timer !== null
      halt()
      if (wasRunning) emit(null)
    },

    isRunning() {
      return timer !== null
    },

    onTick(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}
