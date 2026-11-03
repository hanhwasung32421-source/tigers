// 입출금 계좌(은행/계좌번호/예금주)가 아직 입력되지 않은 일반 회원인지. 가입 때는 계좌를 받지 않으므로, 처음 구매요청을 하거나 내 지갑에 들어갔을 때 입력받는다.
// 한 번 저장하면(서버 기록 + 이 브라우저 표시) 다시 뜨지 않는다. 관리자 계정은 대상이 아니다.
export function useNeedsBank() {
  const { me } = useMe()
  const savedHere = ref(false)
  onMounted(() => {
    try {
      const id = me.value?.id
      if (id && localStorage.getItem(`ktx_bank_saved_${id}`) === '1') savedHere.value = true
    } catch {}
  })
  const needsBank = computed(() => {
    const m = me.value
    if (!m || m.role !== 'user') return false
    if (m.bank_account && m.bank_name && m.account_holder) return false
    return !savedHere.value
  })
  return { needsBank }
}
