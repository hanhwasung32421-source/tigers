type Me = {
  id: number
  username: string
  name?: string
  birth_date?: string
  bank_name?: string
  bank_account?: string
  account_holder?: string
  referral_code?: string
  password_reset_required?: boolean
  password_reset_notice_dismissed_at?: string | null
  role: 'user' | 'super_admin' | 'branch_admin'
}

export function useMe() {
  const me = useState<Me | null>('me', () => null)
  const isLoading = useState<boolean>('me_loading', () => false)

  async function refresh() {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ me: Me | null }>('/api/me', {
        headers,
        credentials: 'include'
      })
      me.value = data.me
    } catch {
      me.value = null
    } finally {
      isLoading.value = false
    }
  }

  return { me, isLoading, refresh }
}
