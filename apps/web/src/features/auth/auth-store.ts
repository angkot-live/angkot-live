import { create } from 'zustand'
import { api, post } from '@/lib/api'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Role, User } from '@/types'

interface AuthState {
  user: User | null
  initialized: boolean
  error: string | null
  refreshUser: () => Promise<User | null>
  login: (email: string, password: string) => Promise<User>
  register: (input: {
    email: string
    password: string
    name: string
    phone: string
    role: 'penumpang' | 'pengemudi'
  }) => Promise<User | null>
  updateProfile: (
    data: Partial<Pick<User, 'name' | 'email' | 'phone'>>,
  ) => Promise<void>
  logout: () => Promise<void>
}
type SessionResponse = { access_token?: string; refresh_token?: string }
async function acceptSession(session: SessionResponse) {
  if (!session.access_token || !session.refresh_token) return false
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) throw error
  return true
}
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: !isSupabaseConfigured,
  error: null,
  refreshUser: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      set({ user: null, initialized: true, error: null })
      return null
    }
    try {
      const user = await api<User>('/me')
      set({ user, initialized: true, error: null })
      return user
    } catch (error) {
      set({
        user: null,
        initialized: true,
        error: error instanceof Error ? error.message : 'Gagal memulihkan akun',
      })
      throw error
    }
  },
  login: async (email, password) => {
    if (!isSupabaseConfigured)
      throw new Error(
        'Konfigurasi Supabase belum diisi. Lihat panduan setup backend.',
      )
    const session = await post<SessionResponse>('/auth/login', {
      email,
      password,
    })
    if (!(await acceptSession(session)))
      throw new Error('Sesi login tidak tersedia.')
    const user = await get().refreshUser()
    if (!user) throw new Error('Profil akun belum tersedia.')
    return user
  },
  register: async (input) => {
    if (!isSupabaseConfigured)
      throw new Error('Konfigurasi Supabase belum diisi.')
    const session = await post<SessionResponse>('/auth/register', input)
    if (!(await acceptSession(session))) return null
    return get().refreshUser()
  },
  updateProfile: async ({ name, phone, email }) => {
    if (email && email !== get().user?.email) {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
    }
    const user = await api<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, phone }),
    })
    set({ user })
  },
  logout: async () => {
    if (get().user?.role === 'pengemudi') {
      try {
        await post('/driver/duty', {
          mode: 'offline',
          session: 'logout-session',
        })
      } catch {
        /* Server TTL removes the last position if unreachable. */
      }
    }
    const { error } = await supabase.auth.signOut()
    set({ user: null, error: error?.message ?? null })
  },
}))
let initialized = false
export function initializeAuth() {
  if (initialized || !isSupabaseConfigured) return
  initialized = true
  void useAuthStore
    .getState()
    .refreshUser()
    .catch(() => {})
  supabase.auth.onAuthStateChange((event) => {
    // Supabase auth callbacks must not await another auth method while holding its lock.
    if (event === 'SIGNED_OUT')
      useAuthStore.setState({ user: null, initialized: true })
    else if (
      event === 'TOKEN_REFRESHED' ||
      event === 'SIGNED_IN' ||
      event === 'USER_UPDATED'
    ) {
      setTimeout(() => {
        void useAuthStore
          .getState()
          .refreshUser()
          .catch(() => {})
      }, 0)
    }
  })
}
export function homeForRole(role: Role) {
  return role === 'admin'
    ? '/admin'
    : role === 'pengemudi'
      ? '/pengemudi'
      : '/penumpang'
}
