import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { driverApplicants } from '@/mocks/admin'
import type { ApplicantStatus, DriverApplicant } from '@/mocks/admin'

interface VerificationState {
  applicants: DriverApplicant[]
  updateStatus: (id: string, status: ApplicantStatus) => void
}

export const useVerificationStore = create<VerificationState>()(
  persist(
    (set) => ({
      applicants: driverApplicants,
      updateStatus: (id, status) =>
        set((state) => ({
          applicants: state.applicants.map((applicant) =>
            applicant.id === id ? { ...applicant, status } : applicant,
          ),
        })),
    }),
    { name: 'angkot-live.verification' },
  ),
)
