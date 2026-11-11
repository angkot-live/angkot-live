import { useRoutes } from './use-routes'
export function RouteLoadState({
  pending,
  error,
}: {
  pending: boolean
  error: Error | null
}) {
  if (error) return <p role="alert">Gagal memuat trayek: {error.message}</p>
  return pending ? <p role="status">Memuat trayek…</p> : null
}

export function RouteCatalogStatus() {
  const { isPending, error } = useRoutes()
  return (
    <div className="container-page text-sm">
      <RouteLoadState pending={isPending} error={error} />
    </div>
  )
}
