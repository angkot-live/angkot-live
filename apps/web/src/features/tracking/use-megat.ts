import { useSyncExternalStore } from 'react'
import { routes } from '@/mocks/data'
import { createMegatStore } from './megat-store'
import type { SnapshotTransport } from './tracking-state'

const KEY = 'angkot-live.megat.v2'
const uniqueId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
let channel: BroadcastChannel | null = null
try { channel = new BroadcastChannel(KEY) } catch { /* Use storage events if unavailable. */ }
const transport: SnapshotTransport = {
  read: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  write: (state) => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* Channel still works. */ } },
  publish: (state) => channel?.postMessage(state),
  listen: (receive) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'request-state') channel?.postMessage(megatStore.getSnapshot().state)
      else receive(event.data)
    }
    const onStorage = (event: StorageEvent) => { if (event.key === KEY) receive(event.newValue) }
    const onVisible = () => { receive(transport.read()); megatStore.tick() }
    channel?.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      channel?.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      channel?.close()
    }
  },
}
export const megatStore = createMegatStore(routes, transport, uniqueId(), () => Date.now(), uniqueId)
channel?.postMessage('request-state')
let consumers = 0
let timer: ReturnType<typeof setInterval> | undefined
function subscribe(listener: () => void) {
  const unsubscribe = megatStore.subscribe(listener)
  if (consumers++ === 0) timer = setInterval(megatStore.tick, 1000)
  return () => { unsubscribe(); if (--consumers === 0) clearInterval(timer) }
}
export function useMegat() { return useSyncExternalStore(subscribe, megatStore.getSnapshot) }
if (import.meta.hot) import.meta.hot.dispose(() => { clearInterval(timer); megatStore.close() })
