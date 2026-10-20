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

// 입금요청/출금요청 음성 알림(TTS): "입금요청" (1초 쉬고) "입금요청" ... 을 30초 동안 반복한다.
// 한 번에 하나의 반복만 돌고, 새 요청이 오면 새로 30초를 시작한다. 요청을 읽어서(미확인 0건) 더 이상 알릴 게 없으면 바로 멈춘다.
const WALLET_TTS_DURATION_MS = 30_000
const WALLET_TTS_GAP_MS = 1000
let walletTtsTimer: any = null
let walletTtsEndAt = 0
let walletTtsKinds: Array<'deposit' | 'withdrawal'> = []
let walletTtsIndex = 0

function stopWalletTts() {
  if (walletTtsTimer) clearTimeout(walletTtsTimer)
  walletTtsTimer = null
  walletTtsEndAt = 0
  if (process.client && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
}

function startWalletTts(kinds: Array<'deposit' | 'withdrawal'>) {
  if (!process.client || !kinds.length) return
  const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    playChimeSound() // 음성 합성을 못 쓰는 브라우저면 알림음으로 대신
    return
  }
  stopWalletTts()
  walletTtsKinds = kinds
  walletTtsIndex = 0
  walletTtsEndAt = Date.now() + WALLET_TTS_DURATION_MS

  const speakNext = () => {
    if (!walletTtsEndAt || Date.now() >= walletTtsEndAt || !walletTtsKinds.length) {
      stopWalletTts()
      return
    }
    const kind = walletTtsKinds[walletTtsIndex % walletTtsKinds.length]
    walletTtsIndex += 1
    const u = new SpeechSynthesisUtterance(kind === 'deposit' ? '입금요청' : '출금요청')
    u.lang = 'ko-KR'
    u.rate = 1
    u.volume = 1
    const next = () => {
      if (walletTtsTimer) clearTimeout(walletTtsTimer)
      walletTtsTimer = setTimeout(speakNext, WALLET_TTS_GAP_MS)
    }
    u.onend = next
    u.onerror = (ev: any) => {
      // 브라우저가 "사용자가 한 번도 화면을 누르지 않았다"며 막은 경우엔 소리를 못 내므로 일반 알림음으로 대신한다.
      if (ev?.error === 'not-allowed') {
        playChimeSound()
        stopWalletTts()
        return
      }
      next()
    }
    try {
      synth.speak(u)
    } catch {
      next()
    }
  }
  speakNext()
}

export function useMessages() {
  const unread = useState<number>('messages_unread_count', () => 0)
  const loading = useState<boolean>('messages_unread_loading', () => false)
  const toast = useState<{ visible: boolean; text: string } | null>('messages_toast', () => null)
  const walletUnread = useState<{ deposit: number; withdrawal: number }>('messages_wallet_unread', () => ({ deposit: 0, withdrawal: 0 }))
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

  // 실시간 도착 알림음은 총관리자 또는 "어드민권한"(쪽지관리 수정 권한)이 있는 관리자만 울린다.
  function canHearRealtimeChime(): boolean {
    const { me } = useMe()
    if (!me.value) return false
    if (me.value.role === 'user') return false
    if (me.value.role === 'super_admin') return true
    return (me.value as any)?.permissions?.menus?.messages?.edit === true
  }

  // 쪽지관리를 "보임"만 가진 부관리자는 볼 수만 있고 알람(팝업/소리)은 받지 않는다.
  function isViewOnlyAdmin(): boolean {
    const { me } = useMe()
    if (!me.value || me.value.role === 'user' || me.value.role === 'super_admin') return false
    return (me.value as any)?.permissions?.menus?.messages?.edit !== true
  }

  async function refreshUnread() {
    if (loading.value) return
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ unread: number; wallet?: { deposit: number; withdrawal: number } }>('/api/messages/unread', { credentials: 'include', headers })
      const next = Number(data.unread || 0)
      const wallet = { deposit: Number(data.wallet?.deposit || 0), withdrawal: Number(data.wallet?.withdrawal || 0) }
      const prevWallet = walletUnread.value
      const walletTotal = wallet.deposit + wallet.withdrawal
      // 새로 들어온 입금/출금 요청 종류(이전 확인 때보다 미확인 수가 늘어난 종류)
      const newKinds: Array<'deposit' | 'withdrawal'> = []
      if (wallet.deposit > prevWallet.deposit) newKinds.push('deposit')
      if (wallet.withdrawal > prevWallet.withdrawal) newKinds.push('withdrawal')

      // 새 쪽지가 실시간으로 도착한 경우에만 팝업+알림음(최초 로드 시에는 띄우지 않음)
      if (process.client && initialized && next > unread.value && !isViewOnlyAdmin()) {
        const { t } = useLocale()
        if (newKinds.length) {
          // 입금요청/출금요청: 일반 알림음 대신 음성(TTS)으로 30초 동안 반복
          showToast(newKinds.includes('deposit') && !newKinds.includes('withdrawal') ? t('입금요청이 접수되었습니다.', 'A deposit request has arrived.') : newKinds.includes('withdrawal') && !newKinds.includes('deposit') ? t('출금요청이 접수되었습니다.', 'A withdrawal request has arrived.') : t('입출금 요청이 접수되었습니다.', 'New deposit/withdrawal requests have arrived.'))
          if (canHearRealtimeChime()) startWalletTts(newKinds)
        } else {
          showToast(t('새 쪽지가 도착했습니다.', 'A new message has arrived.'))
          if (canHearRealtimeChime()) playChimeSound()
        }
      }
      // 화면에 처음 들어왔을 때 이미 확인 안 한 쪽지가 있으면, 세션당 한 번 진입 알림음을 울린다.
      // (미확인 쪽지에 입금/출금 요청이 있으면 그 부분은 음성으로, 나머지 쪽지가 있을 때만 알림음)
      if (process.client && !entryChimePlayed && !initialized && next > 0 && !isViewOnlyAdmin()) {
        entryChimePlayed = true
        if (walletTotal > 0 && canHearRealtimeChime()) {
          const kinds: Array<'deposit' | 'withdrawal'> = []
          if (wallet.deposit > 0) kinds.push('deposit')
          if (wallet.withdrawal > 0) kinds.push('withdrawal')
          startWalletTts(kinds)
        }
        if (next > walletTotal) playChimeSound()
      }
      // 읽어서 더 이상 미확인 입출금 요청이 없으면 음성 반복을 멈춘다.
      if (process.client && walletTotal === 0 && walletTtsEndAt) stopWalletTts()
      walletUnread.value = wallet
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
    stopWalletTts()
  }

  return { unread, loading, toast, refreshUnread, startUnreadPolling, stopUnreadPolling }
}
