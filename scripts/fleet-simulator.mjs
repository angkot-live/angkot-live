// Movement follows one real route chain at a time, in the catalog's direction.
// A new duty is required to loop back; never send a GPS jump across terminals.
export function distance(a, b) {
  const radians = Math.PI / 180
  return Math.hypot(
    (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * radians),
    b[0] - a[0],
  ) * 111.195
}

export function prepareRoute(route) {
  const lines = route.segments?.length ? route.segments : [route.polyline]
  const chains = lines.map((points, index) => {
    const cumulative = [0]
    for (let i = 1; i < points.length; i++)
      cumulative.push(cumulative.at(-1) + distance(points[i - 1], points[i]))
    return { points, index, cumulative, length: cumulative.at(-1) }
  }).filter((chain) => chain.points.length >= 2 && chain.length > 0)
  if (!chains.length) throw new Error(`Trayek ${route.id} tidak memiliki segmen valid`)
  return chains
}

export function fleetFrame(chain, offsetKm) {
  const offset = Math.max(0, Math.min(chain.length, offsetKm))
  let index = 0
  while (index < chain.points.length - 2 && chain.cumulative[index + 1] < offset)
    index++
  const a = chain.points[index], b = chain.points[index + 1]
  const length = chain.cumulative[index + 1] - chain.cumulative[index]
  const fraction = length > 0 ? (offset - chain.cumulative[index]) / length : 0
  return {
    position: [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction],
    heading: (Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI + 360) % 360,
    offsetKm: offset,
    ended: offset >= chain.length,
  }
}

export function loopbackURL(value) {
  const url = new URL(value)
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.protocol !== 'http:' || url.username || url.password)
    throw new Error('Simulasi armada hanya boleh mengakses API HTTP loopback lokal.')
  return url
}
