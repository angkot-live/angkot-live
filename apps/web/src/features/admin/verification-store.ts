import { create } from 'zustand'
import { api } from '@/lib/api'
export interface Applicant {
  id: string
  name: string
  email: string
  phone: string
  nik: string
  sim_number: string
  verification_status: 'menunggu' | 'disetujui' | 'ditolak'
  submitted_at: string
  rejection_reason: string | null
  onboarding: Record<string, string>
  documents: {
    id: string
    document_type: string
    file_name: string
    file_path: string
    uploaded_at: string
  }[]
}
let generation = 0
export const useVerificationStore = create<{
  applicants: Applicant[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  clear: () => void
  updateStatus: (
    id: string,
    status: 'disetujui' | 'ditolak',
    reason?: string,
  ) => Promise<void>
}>((set, get) => ({
  applicants: [],
  error: null,
  loaded: false,
  load: async () => {
    const current = generation
    try {
      const applicants = await api<Applicant[]>('/admin/drivers')
      if (current === generation) set({ applicants, error: null, loaded: true })
    } catch (e) {
      if (current === generation)
        set({
          error: e instanceof Error ? e.message : 'Gagal memuat pendaftar',
        })
    }
  },
  clear: () => {
    generation++
    set({ applicants: [], error: null, loaded: false })
  },
  updateStatus: async (id, status, reason) => {
    await api('/admin/drivers/verify', {
      method: 'PATCH',
      body: JSON.stringify({ id, status, reason, key: crypto.randomUUID() }),
    })
    await get().load()
  },
}))
