import { Clock3, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/ui/logo'

const highlights = [
  { icon: MapPin, label: 'Posisi realtime', tone: 'bg-leaf' },
  { icon: Clock3, label: 'ETA presisi', tone: 'bg-sky' },
  { icon: ShieldCheck, label: 'Armada terverifikasi', tone: 'bg-peach' },
]

function TransitScene() {
  return (
    <div className="relative rounded-lg border border-white/70 bg-white/80 p-4 shadow-card backdrop-blur">
      <div className="relative h-40 overflow-hidden rounded-md bg-muted">
        <svg viewBox="0 0 400 160" className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <pattern id="auth-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="#DCE5DA" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="160" fill="#EEF3EC" />
          <rect width="400" height="160" fill="url(#auth-grid)" />
          <path
            d="M-20 120 C 70 100, 120 60, 210 70 S 330 110, 420 50"
            fill="none"
            stroke="#C3D3C0"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M-20 120 C 70 100, 120 60, 210 70 S 330 110, 420 50"
            fill="none"
            stroke="#F6FBF5"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M60 170 C 90 120, 160 100, 240 80 S 350 40, 380 -10"
            fill="none"
            stroke="#1F5C3A"
            strokeWidth="3"
            strokeDasharray="8 7"
            opacity="0.5"
          />
        </svg>
        <span className="absolute top-4 left-5 rounded-full bg-brand-strong px-2.5 py-1 text-xs font-bold text-white shadow-float">
          08
        </span>
        <span className="absolute top-14 right-10 rounded-full bg-sky-ink px-2.5 py-1 text-xs font-bold text-white shadow-float">
          05
        </span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink-strong shadow-float">
          02
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-md bg-leaf px-3 py-2">
        <div>
          <p className="text-xs font-medium text-brand-strong/70">Angkot 08 menuju Dago</p>
          <p className="text-xs font-bold text-brand-strong">Tiba 3 menit lagi</p>
        </div>
        <Sparkles size={16} className="text-brand" />
      </div>
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-4 py-8 md:px-8 md:py-12">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-lg border-[0.5px] border-line-soft bg-surface shadow-float lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-leaf via-muted to-line-soft p-10 lg:flex xl:p-14">
          <svg className="absolute inset-0 size-full opacity-20" aria-hidden>
            <defs>
              <pattern id="auth-road" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M64 0H0V64" fill="none" stroke="#1F5C3A" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-road)" />
          </svg>
          <div
            className="pointer-events-none absolute top-1/3 left-1/4 size-72 rounded-full bg-brand-soft/40 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 bottom-16 size-64 rounded-full bg-sky/40 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-3">
            <div className="inline-flex w-fit rounded-lg bg-white p-1.5 shadow-soft">
              <Logo />
            </div>
            <div className="pt-3">
              <h1 className="max-w-md text-h2 leading-[1.25] font-extrabold tracking-tight text-brand-strong">
                Tahu angkot kamu di mana,
                <br />
                kapan tiba.
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink">
                Pantau armada angkutan kota secara realtime, prediksi estimasi waktu sampai dengan
                presisi radar digital.
              </p>
            </div>
          </div>

          <div className="relative py-6">
            <TransitScene />
          </div>

          <ul className="relative flex flex-wrap gap-2">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="inline-flex items-center gap-2 rounded-md bg-white/70 px-2.5 py-2 text-xs font-semibold text-ink-strong backdrop-blur"
              >
                <span className={`grid size-6 place-items-center rounded ${item.tone}`}>
                  <item.icon size={13} className="text-brand-strong" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Logo />
            </div>
            {children}
          </div>
        </section>
      </div>

      <p className="fixed inset-x-0 bottom-3 text-center text-xs text-ink-soft">
        © 2026 Angkot-Live · <Link to="/bantuan" className="hover:text-ink">Bantuan</Link> ·{' '}
        <Link to="/bantuan" className="hover:text-ink">Privasi</Link>
      </p>
    </div>
  )
}
