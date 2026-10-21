// "앱 설치" 버튼(첫 화면의 스토어/QR 버튼, 하단 메뉴의 앱 설치): 로그인한 상태에서 누르면 출시 예정 안내를 띄운다.
export function useLaunchNotice() {
  const open = useState<boolean>('launch_notice_open', () => false)
  function show() {
    open.value = true
  }
  function hide() {
    open.value = false
  }
  return { open, show, hide }
}
