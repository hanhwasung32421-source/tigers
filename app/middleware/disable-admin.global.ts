// 거래소(KTX)에서는 관리자 화면(/admin/…)을 쓰지 않는다. 관리자 화면은 ADMIN 사이트에서만 수정/사용한다.
// 주소를 직접 입력해도 들어가지지 않게 홈으로 돌려보낸다(서버/API는 그대로). 다시 열려면 아래 값을 true로 바꾸면 된다.
const ADMIN_PAGES_ENABLED = false

export default defineNuxtRouteMiddleware((to) => {
  if (ADMIN_PAGES_ENABLED) return
  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    return navigateTo('/', { replace: true })
  }
})
