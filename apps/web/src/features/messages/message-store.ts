import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { driverMessages } from '@/mocks/driver'
import type { DriverMessage } from '@/mocks/driver'

interface SendMessageInput {
  title: string
  body: string
  from?: string
  role?: string
  kind?: DriverMessage['kind']
}

interface MessageState {
  messages: DriverMessage[]
  sendMessage: (input: SendMessageInput) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

function formatTime() {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      messages: driverMessages,
      sendMessage: (input) =>
        set((state) => ({
          messages: [
            {
              id: `msg-${Date.now()}`,
              from: input.from ?? 'Admin Angkot-Live',
              role: input.role ?? 'Administrator',
              title: input.title,
              body: input.body,
              time: formatTime(),
              kind: input.kind ?? 'admin',
              unread: true,
            },
            ...state.messages,
          ],
        })),
      markRead: (id) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, unread: false } : message,
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          messages: state.messages.map((message) => ({ ...message, unread: false })),
        })),
    }),
    { name: 'angkot-live.messages' },
  ),
)
