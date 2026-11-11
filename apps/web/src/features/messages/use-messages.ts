import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/auth-store'
import { api, post } from '@/lib/api'
export interface Message {
  id: string
  title: string
  content: string
  created_at: string
  is_read: boolean
  kind?: string
  related_report_id?: string | null
}
export function useMessages() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient()
  const query = useQuery({
    queryKey: ['messages', user?.id],
    enabled: !!user,
    queryFn: () => api<Message[]>('/messages'),
    refetchInterval: 5000,
  })
  async function markRead(id?: string) {
    await post('/messages/read', { id })
    await client.invalidateQueries({ queryKey: ['messages', user?.id] })
  }
  return { ...query, messages: query.data ?? [], markRead }
}
