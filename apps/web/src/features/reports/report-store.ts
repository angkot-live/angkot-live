import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { reports as seedReports } from '@/mocks/data'
import type { Report, ReportCategory, ReportStatus } from '@/types'

interface AddReportInput {
  category: ReportCategory
  subject: string
  description: string
  plate?: string
}

interface ReportState {
  reports: Report[]
  addReport: (input: AddReportInput) => Report
  updateReport: (id: string, patch: { status?: ReportStatus; response?: string }) => void
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: seedReports,
      addReport: (input) => {
        const report: Report = {
          id: `rep-${Date.now()}`,
          code: `LPR-${1060 + get().reports.length}`,
          category: input.category,
          subject: input.subject,
          description: input.description,
          plate: input.plate,
          status: 'diterima',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ reports: [report, ...state.reports] }))
        return report
      },
      updateReport: (id, patch) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === id ? { ...report, ...patch } : report,
          ),
        })),
    }),
    { name: 'angkot-live.reports' },
  ),
)
