import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder',
)

// Fallback dummy credentials jika belum disetel di .env, agar app tidak crash saat demo lokal
const safeUrl = isSupabaseConfigured
  ? new URL(supabaseUrl, window.location.origin).href.replace(/\/$/, '')
  : 'https://placeholder.supabase.co'
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder'

export const supabase = createClient<Database>(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
