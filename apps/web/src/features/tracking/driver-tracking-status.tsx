import { useLiveStore } from './live-store'

export function DriverTrackingStatus() {
  const {
    connection,
    duty,
    serverTime,
    gpsFix,
    gpsError,
    deviceGpsError,
    lastAckSampleAt,
    ackLatencyMs,
    wakeLock,
  } = useLiveStore()
  const simulated = duty.vehicle?.telemetrySource === 'simulation'
  const active = ['narik', 'ngetem'].includes(duty.mode)
  const fresh =
    connection === 'connected' &&
    active &&
    !!duty.vehicle?.lastSeenAt &&
    serverTime - duty.vehicle.lastSeenAt <= 15000
  return (
    <div className="space-y-1 text-sm" aria-live="polite">
      <p role="status">
        {connection === 'connected'
          ? 'Realtime tersambung'
          : 'Realtime terputus / menyambungkan ulang'}{' '}
        ·{' '}
        {fresh
          ? simulated
            ? 'Simulasi aktif'
            : 'GPS aktif'
          : active
            ? simulated
              ? 'Menunggu sampel simulasi'
              : 'Menunggu GPS perangkat'
            : 'GPS tidak dibagikan'}
      </p>
      {active && (
        <p className="text-xs text-ink">
          {simulated
            ? 'SIMULASI PENGUJIAN LOKAL'
            : gpsFix
              ? `Akurasi ±${Math.round(gpsFix.accuracy)} m`
              : 'Menunggu izin dan sampel lokasi'}{' '}
          ·{' '}
          {lastAckSampleAt
            ? `${simulated ? 'Simulasi' : 'GPS'} diakui server ${Math.max(0, Math.round((serverTime - lastAckSampleAt) / 1000))} dtk lalu${ackLatencyMs === null ? '' : ` (${ackLatencyMs} ms)`}`
            : 'Belum ada pengiriman GPS yang diakui server'}{' '}
          ·{' '}
          {wakeLock === 'active'
            ? 'Layar tetap menyala'
            : 'Biarkan halaman terlihat dan layar menyala'}
        </p>
      )}
      {active && !fresh && connection !== 'connected' && (
        <p className="text-xs text-warning">Koneksi terputus. Sampel lokasi belum dapat dikonfirmasi; tunggu penyambungan ulang sebelum menyimpulkan GPS gagal.</p>
      )}
      {active && !fresh && connection === 'connected' && simulated && (
        <p className="text-xs text-ink">Simulasi belum mengirim sampel yang diakui server. Periksa sumber posisi dan pengaturan simulasi.</p>
      )}
      {active && !fresh && connection === 'connected' && !simulated && (
        <p className="text-xs text-ink">Periksa izin lokasi dan HTTPS. Biarkan tab terlihat; bila GPS tetap gagal, pilih Offline sebelum memulai ulang.</p>
      )}
      {active && (deviceGpsError || gpsError) && (
        <p role="alert" className="text-danger">
          {deviceGpsError ?? gpsError}
        </p>
      )}
    </div>
  )
}
