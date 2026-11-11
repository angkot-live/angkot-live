import { distanceKm, type LatLng } from '../../lib/geo.ts'

// Pure movement math for the opt-in local testing source. Never joins chains.
export function simulationFrame(
  line: LatLng[],
  offsetKm: number,
  speedKph: number,
  elapsedMs: number,
) {
  if (line.length < 2) throw new Error('Segmen simulasi memerlukan dua titik')
  const lengths = line.slice(1).map((p, i) => distanceKm(line[i], p))
  const totalKm = lengths.reduce((a, b) => a + b, 0)
  const next = Math.max(
    0,
    Math.min(
      totalKm,
      offsetKm +
        (Math.max(0, Math.min(40, speedKph)) * Math.max(0, elapsedMs)) /
          3600000,
    ),
  )
  let traversed = 0,
    index = 0
  while (index < lengths.length - 1 && traversed + lengths[index] < next) {
    traversed += lengths[index]
    index++
  }
  const a = line[index],
    b = line[index + 1],
    fraction = lengths[index] > 0 ? (next - traversed) / lengths[index] : 0
  const position: LatLng = [
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
  ]
  const heading =
    ((Math.atan2(
      (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180),
      b[0] - a[0],
    ) *
      180) /
      Math.PI +
      360) %
    360
  const ended = next >= totalKm
  return {
    position,
    heading,
    offsetKm: next,
    totalKm,
    speedKph: ended ? 0 : Math.max(0, Math.min(40, speedKph)),
    ended,
  }
}
