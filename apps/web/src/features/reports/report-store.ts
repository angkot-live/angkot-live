import { create } from 'zustand'
import { api, post } from '@/lib/api'
import type { Report, ReportCategory, ReportStatus } from '@/types'
interface Row {
  id: string
  code: string
  category: ReportCategory
  subject: string
  description: string
  status: ReportStatus
  created_at: string
  plate_number?: string
  evidence_urls: string[]
  updates?: {
    id: string
    status: ReportStatus
    notes: string
    created_at: string
  }[]
}
export interface LiveReport extends Report {
  evidence: string[]
  updates: NonNullable<Row['updates']>
}
function mapReport(r: Row): LiveReport {
  return {
    id: r.id,
    code: r.code,
    category: r.category,
    subject: r.subject,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    plate: r.plate_number,
    response: r.updates?.at(-1)?.notes,
    evidence: r.evidence_urls ?? [],
    updates: r.updates ?? [],
  }
}
let generation = 0
export const useReportStore = create<{
  reports: LiveReport[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  clear: () => void
  addReport: (input: {
    key?: string
    category: ReportCategory
    subject: string
    description: string
    plate?: string
    vehicleId?: string
    evidence?: string[]
  }) => Promise<Report>
  updateReport: (
    id: string,
    patch: { status?: ReportStatus; response?: string },
    key?: string,
  ) => Promise<void>
}>((set, get) => ({
  reports: [],
  error: null,
  loaded: false,
  load: async () => {
    const current = generation
    try {
      const rows = await api<Row[]>('/reports')
      if (current === generation)
        set({ reports: rows.map(mapReport), error: null, loaded: true })
    } catch (e) {
      if (current === generation)
        set({ error: e instanceof Error ? e.message : 'Gagal memuat laporan' })
    }
  },
  clear: () => {
    generation++
    set({ reports: [], error: null, loaded: false })
  },
  addReport: async (input) => {
    const row = await post<Row>('/reports', {
      ...input,
      key: input.key ?? crypto.randomUUID(),
    })
    await get().load()
    return mapReport(row)
  },
  updateReport: async (id, patch, key) => {
    await api('/admin/reports', {
      method: 'PATCH',
      body: JSON.stringify({
        id,
        ...patch,
        expectedStatus: get().reports.find((r) => r.id === id)?.status,
        key: key ?? crypto.randomUUID(),
      }),
    })
    await get().load()
  },
}))
