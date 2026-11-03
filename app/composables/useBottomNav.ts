// 모바일 하단 메뉴(선물거래/레버리지/내 지갑/투자내역/고객센터)를 보여줄 화면인지.
// 로그인/가입/관리자 화면에서는 숨긴다.
export function useBottomNavVisible() {
  const route = useRoute()
  return computed(() => {
    const p = route.path
    return !(p.startsWith('/admin') || p.startsWith('/auth') || p === '/impersonate')
  })
}
