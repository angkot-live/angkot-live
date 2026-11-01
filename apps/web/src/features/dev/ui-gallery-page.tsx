import { ArrowRight, Bell, BusFront, CheckCircle2, MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import {
  Badge,
  DriverModeBadge,
  ReportStatusBadge,
  VehicleStatusBadge,
} from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState, ErrorState } from '@/components/ui/empty-state'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { reports } from '@/mocks/data'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-line-soft pb-10">
      <div>
        <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
        {description ? <p className="text-sm text-ink">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function UiGalleryPage() {
  const [checked, setChecked] = useState(true)

  return (
    <div className="min-h-svh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-surface/90 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              Ke beranda
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </header>

      <div className="container-page flex flex-col gap-10 py-10">
        <div>
          <Badge variant="leaf">Design system</Badge>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-strong">
            UI Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Referensi komponen dasar sebelum slicing halaman. Semua memakai token warna, radius,
            dan shadow dari Figma.
          </p>
        </div>

        <Section title="Button" description="Varian, ukuran, dan state disabled.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" aria-label="Notifikasi">
              <Bell size={18} />
            </Button>
          </div>
        </Section>

        <Section title="Badge status" description="Status kendaraan, mode pengemudi, dan laporan.">
          <div className="flex flex-wrap items-center gap-2">
            <VehicleStatusBadge status="jalan" />
            <VehicleStatusBadge status="merayap" />
            <VehicleStatusBadge status="ngetem" />
            <VehicleStatusBadge status="istirahat" />
            <DriverModeBadge mode="narik" />
            <DriverModeBadge mode="ngetem" />
            <ReportStatusBadge status="diterima" />
            <ReportStatusBadge status="diproses" />
            <ReportStatusBadge status="selesai" />
          </div>
        </Section>

        <Section title="Form" description="Input, select, textarea, dan checkbox.">
          <div className="grid max-w-3xl gap-4 md:grid-cols-2">
            <Field label="Email" htmlFor="gallery-email" required>
              <Input id="gallery-email" placeholder="nama@email.com" icon={<Search size={16} />} />
            </Field>
            <Field label="Trayek" htmlFor="gallery-route">
              <Select id="gallery-route" defaultValue="r-08">
                <option value="r-08">08 — Stasiun Hall / Dago</option>
                <option value="r-05">05 — Cicaheum / Ledeng</option>
                <option value="r-02">02 — Kalapa / Cicaheum</option>
              </Select>
            </Field>
            <Field
              label="Deskripsi laporan"
              htmlFor="gallery-desc"
              hint="Jelaskan kronologi secara singkat."
              className="md:col-span-2"
            >
              <Textarea id="gallery-desc" placeholder="Tulis detail laporan..." />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
              Saya menyetujui syarat dan ketentuan
            </label>
          </div>
        </Section>

        <Section title="Card & metric" description="Kartu konten dan metrik ringkas.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Posisi Realtime</CardTitle>
                <CardDescription>GPS tracking dengan akurasi tinggi.</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="grid size-10 place-items-center rounded-md bg-leaf text-brand-strong">
                  <MapPin size={19} />
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-md bg-sky text-sky-ink">
                  <BusFront size={20} />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-ink-strong">1.240+</p>
                  <p className="text-xs text-ink">Angkot aktif</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <Avatar name="Sari Wulandari" size="lg" />
                <div>
                  <p className="text-sm font-bold text-ink-strong">Sari Wulandari</p>
                  <p className="text-xs text-ink">Penumpang · Bandung</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Dialog, sheet, tabs">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Buka dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi ngetem</DialogTitle>
                  <DialogDescription>
                    Kendaraan Anda tidak bergerak selama 90 detik. Apakah Anda sedang ngetem?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost">Bukan</Button>
                  <Button>Ya, ngetem</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Buka sheet</Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Detail angkot</SheetTitle>
                </SheetHeader>
                <div className="px-6 text-sm text-ink">
                  Panel samping untuk detail angkot di layar kecil.
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Tabs defaultValue="semua" className="max-w-md">
            <TabsList>
              <TabsTrigger value="semua">Semua</TabsTrigger>
              <TabsTrigger value="proses">Diproses</TabsTrigger>
              <TabsTrigger value="selesai">Selesai</TabsTrigger>
            </TabsList>
            <TabsContent value="semua" className="text-sm text-ink">
              3 laporan ditemukan.
            </TabsContent>
            <TabsContent value="proses" className="text-sm text-ink">
              1 laporan sedang diproses.
            </TabsContent>
            <TabsContent value="selesai" className="text-sm text-ink">
              1 laporan selesai.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Table" description="Daftar laporan dengan status.">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Kode</TableHeaderCell>
                <TableHeaderCell>Subjek</TableHeaderCell>
                <TableHeaderCell>Kategori</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-semibold text-ink-strong">{report.code}</TableCell>
                  <TableCell>{report.subject}</TableCell>
                  <TableCell className="capitalize">{report.category}</TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Empty, error, skeleton">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={<CheckCircle2 size={22} />}
              title="Belum ada laporan"
              description="Laporan yang Anda buat akan muncul di sini."
              action={<Button size="sm">Buat laporan</Button>}
            />
            <ErrorState
              title="Gagal memuat posisi"
              description="Koneksi WebSocket terputus. Coba sambungkan ulang."
              action={<Button size="sm">Coba lagi</Button>}
            />
          </div>
          <div className="grid max-w-md gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Section>
      </div>
    </div>
  )
}
