export const STALE_GPS_MS = 15000

export interface SnapshotTransport {
  read: () => unknown
  write: (state: unknown) => void
  publish: (state: unknown) => void
  listen: (receive: (state: unknown) => void) => () => void
}
