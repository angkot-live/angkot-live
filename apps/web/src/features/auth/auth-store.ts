import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { DriverVerificationStatus, Role, User } from '@/types'

const roleNames: Record<Role, string> = {
  penumpang: 'Sari Wulandari',
  pengemudi: 'Asep Sunandar',
  admin: 'Petugas Dishub',
}

interface AuthState {
  user: User | null
  login: (
    role: Role,
    email?: string,
    name?: string,
    driverVerification?: DriverVerificationStatus,
  ) => User
  setDriverVerification: (status: DriverVerificationStatus) => void
  updateProfile: (data: Partial<Pick<User, 'name' | 'email' | 'phone'>>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (role, email = 'demo@angkot-live.id', name, driverVerification) => {
        const user: User = {
          id: `u-${role}`,
          name: name ?? roleNames[role],
          email,
          phone: '0812 3456 7890',
          role,
          driverVerification:
            role === 'pengemudi' ? (driverVerification ?? 'disetujui') : undefined,
        }
        set({ user })
        return user
      },
      setDriverVerification: (status) =>
        set((state) =>
          state.user ? { user: { ...state.user, driverVerification: status } } : state,
        ),
      updateProfile: (data) =>
        set((state) => (state.user ? { user: { ...state.user, ...data } } : state)),
      logout: () => set({ user: null }),
    }),
    { name: 'angkot-live.auth' },
  ),
)

export function homeForRole(role: Role) {
  if (role === 'admin') return '/admin'
  if (role === 'pengemudi') return '/pengemudi'
  return '/penumpang'
}
