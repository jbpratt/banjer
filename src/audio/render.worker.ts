// Renders plucks off the main thread. dsp.ts is pure, so this is just a message loop.
import { renderPluck } from './dsp.ts'
import type { RenderReply, RenderRequest } from './render.ts'

// tsconfig has the DOM lib, not WebWorker; this is the slice of the worker scope we use.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<RenderRequest>) => void) | null
  postMessage(msg: RenderReply, transfer?: Transferable[]): void
}

scope.onmessage = ({ data: { id, midi, variant, sampleRate } }) => {
  try {
    const samples = renderPluck(midi, variant, sampleRate)
    scope.postMessage({ id, samples }, [samples.buffer])
  } catch (e) {
    scope.postMessage({ id, error: String(e) })
  }
}
