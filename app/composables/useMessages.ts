export function useMessages() {
  const unread = useState<number>('messages_unread_count', () => 0)
  const loading = useState<boolean>('messages_unread_loading', () => false)

  async function refreshUnread() {
    if (loading.value) return
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ unread: number }>('/api/messages/unread', { credentials: 'include', headers })
      unread.value = Number(data.unread || 0)
    } catch {
      unread.value = 0
    } finally {
      loading.value = false
    }
  }

  return { unread, loading, refreshUnread }
}
