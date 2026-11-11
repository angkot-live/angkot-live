import { create } from 'zustand'
export const useSimulatorStore = create(() => ({
  source: 'gps' as 'gps' | 'simulation',
  speedKph: 20,
  startPercent: 0,
  chain: 0,
  paused: false,
  ended: false,
}))
