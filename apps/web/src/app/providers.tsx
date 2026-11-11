import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TrackingProvider } from '@/features/tracking/tracking-provider'
import { RouteCatalogStatus } from '@/features/routes/route-load-state'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TrackingProvider />
      <RouteCatalogStatus />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
