import { supabase } from './supabase'

export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(
  /\/$/,
  '',
)
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(options.headers)
  if (data.session)
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    })
  } catch {
    throw new Error(
      'Backend belum dapat dihubungi. Periksa koneksi dan konfigurasi layanan.',
    )
  }
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error(
      'Backend belum tersedia atau mengembalikan respons tidak valid.',
    )
  }
  if (!response.ok)
    throw new Error(
      (value as { error?: string }).error ?? 'Permintaan gagal diproses.',
    )
  return value as T
}
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Permintaan gagal diproses.'
}
export async function upload(file: File, type: string) {
  const body = new FormData()
  body.set('file', file)
  body.set('type', type)
  return api<{ path: string; name: string }>('/uploads', {
    method: 'POST',
    body,
  })
}
