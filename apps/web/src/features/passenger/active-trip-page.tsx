import { BusFront } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ActiveTripPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-3 py-8 text-center">
      <BusFront size={32} className="text-ink-soft" />
      <h1 className="text-xl font-bold text-ink-strong">Belum ada perjalanan aktif</h1>
      <p className="max-w-md text-sm text-ink">Perjalanan akan tersedia setelah kendaraan dengan sumber GPS aktif terhubung dan Anda naik angkot.</p>
      <Button asChild><Link to="/penumpang">Kembali ke peta</Link></Button>
    </div>
  )
}
