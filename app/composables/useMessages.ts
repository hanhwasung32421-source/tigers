// 브라우저 알림음 없이도(오디오 파일 없이) 재생 가능한 짧은 "띵동" 2음 차임을 Web Audio API로 만든다.
function playChimeSound() {
  if (!process.client) return
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes: Array<[number, number]> = [
      [880, 0], // 띵(높은 음)
      [659, 0.16] // 동(낮은 음)
    ]
    for (const [freq, offset] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.28, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.45)
    }
    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 900)
  } catch {
    // 자동재생 정책 등으로 실패해도 조용히 무시(토스트/뱃지로는 계속 알림)
  }
}

export function useMessages() {
  const unread = useState<number>('messages_unread_count', () => 0)
  const loading = useState<boolean>('messages_unread_loading', () => false)
  const toast = useState<{ visible: boolean; text: string } | null>('messages_toast', () => null)
  let pollTimer: any = null
  let toastTimer: any = null
  let initialized = false
  // 이번 화면(탭)에 들어와서 미확인 쪽지가 있을 때 울리는 "진입 알림음"은 세션당 한 번만 울린다.
  let entryChimePlayed = false

  function showToast(text: string) {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { visible: true, text }
    toastTimer = setTimeout(() => {
      toast.value = null
    }, 4000)
  }

  // 실시간 도착 알림음은 총관리자 또는 "쪽지관리" 메뉴를 볼 수 있는 관리자만 울린다.
  function canHearRealtimeChime(): boolean {
    const { me } = useMe()
    if (!me.value) return false
    if (me.value.role === 'user') return false
    if (me.value.role === 'super_admin') return true
    return (me.value as any)?.permissions?.menus?.messages?.view !== false
  }

  async function refreshUnread() {
    if (loading.value) return
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ unread: number }>('/api/messages/unread', { credentials: 'include', headers })
      const next = Number(data.unread || 0)
      // 새 쪽지가 실시간으로 도착한 경우에만 팝업+알림음(최초 로드 시에는 띄우지 않음)
      if (process.client && initialized && next > unread.value) {
        const { t } = useLocale()
        showToast(t('새 쪽지가 도착했습니다.', 'A new message has arrived.'))
        if (canHearRealtimeChime()) playChimeSound()
      }
      // 화면에 처음 들어왔을 때 이미 확인 안 한 쪽지가 있으면, 세션당 한 번 진입 알림음을 울린다.
      if (process.client && !entryChimePlayed && !initialized && next > 0) {
        entryChimePlayed = true
        playChimeSound()
      }
      unread.value = next
      initialized = true
    } catch (e: any) {
      unread.value = 0
      // 로그인 세션이 만료된 상태로 폴링이 계속 돌면 5초마다 같은 401만 반복되므로,
      // 그 경우엔 폴링을 멈춘다(다시 로그인해서 레이아웃이 재마운트되면 새로 시작됨).
      const status = e?.response?.status ?? e?.statusCode
      if (status === 401) stopUnreadPolling()
    } finally {
      loading.value = false
    }
  }

  function startUnreadPolling() {
    if (!process.client) return
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => {
      refreshUnread()
    }, 5000)
  }

  function stopUnreadPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  return { unread, loading, toast, refreshUnread, startUnreadPolling, stopUnreadPolling }
}
