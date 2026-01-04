// Taut Renderer Helpers
// Shared utilities for the renderer process
// Re-exports TautBridge and provides TypedEventTarget for type-safe events

import type { TautBridge } from '../preload/preload'

const global = window as any

const TautBridge: TautBridge = global.TautBridge
if (!TautBridge) {
  throw new Error('[Taut] TautBridge is not available in the renderer context')
}
export { TautBridge }

export class TypedEventTarget<
  TEvents extends Record<string, unknown>,
> extends EventTarget {
  on<K extends keyof TEvents>(
    type: K,
    listener: (event: CustomEvent<TEvents[K]>) => void,
    options?: AddEventListenerOptions
  ) {
    this.addEventListener(type as string, listener as EventListener, options)
  }

  off<K extends keyof TEvents>(
    type: K,
    listener: (event: CustomEvent<TEvents[K]>) => void,
    options?: EventListenerOptions
  ) {
    this.removeEventListener(type as string, listener as EventListener, options)
  }

  emit<K extends keyof TEvents>(type: K, detail: TEvents[K]) {
    this.dispatchEvent(new CustomEvent(type as string, { detail }))
  }
}
