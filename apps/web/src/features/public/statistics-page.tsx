import { errorMessage } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicStatistics } from './use-statistics'
export function StatisticsPage() {
  const { data, error, isPending } = usePublicStatistics()
  return (
    <div className="container-page space-y-5 py-8">
      <h1 className="text-2xl font-extrabold">
        Statistik transparansi layanan
      </h1>
      <p className="text-sm text-ink">
        Ringkasan armada aktif dan tindak lanjut laporan masyarakat.
      </p>
      {isPending && <p>Memuat statistik…</p>}
      {error && <p role="alert">{errorMessage(error)}</p>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Arah trayek aktif', data.routes],
              ['Kode jurusan aktif', data.routeCodes],
              ['Armada terdaftar', data.totalVehicles],
              ['Angkot dengan GPS aktif', data.activeVehicles],
              ['Pengemudi terverifikasi', data.verifiedDrivers],
              ['Laporan masuk', data.reports],
              [
                'Laporan ditindaklanjuti',
                `${data.reports ? Math.round(((data.processing + data.resolved) / data.reports) * 100) : 0}%`,
              ],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm text-ink">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-bold">Status laporan</h2>
              <p className="text-sm">
                Diterima: {data.received} · Diproses: {data.processing} ·
                Selesai: {data.resolved}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-bold">Angkot aktif per jurusan</h2>
              {Object.keys(data.activeByRoute).length === 0 ? (
                <p className="text-sm text-ink">
                  Belum ada kendaraan dengan GPS aktif.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Jurusan</th>
                      <th>Kendaraan aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.activeByRoute)
                      .sort()
                      .map(([code, count]) => (
                        <tr key={code}>
                          <td className="py-2">{code}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
