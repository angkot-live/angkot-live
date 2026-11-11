import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'

export default function App() {
  return (
    <AppProviders>
      <Suspense
        fallback={
          <p role="status" className="p-8 text-sm text-ink">
            Memuat halaman…
          </p>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  )
}
