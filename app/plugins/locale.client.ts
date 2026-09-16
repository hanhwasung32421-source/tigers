// 저장된 언어 설정(localStorage)을 복원한다.
// app:suspense:resolve(레이아웃/페이지의 top-level await가 모두 끝나 Suspense가 완전히 해소된 시점)에서
// 복원해야, 그 이전(app:mounted 등)에 바꿨을 때 일부 form 엘리먼트의 :placeholder 같은 속성이
// 갱신되지 않는 문제를 피할 수 있다.
export default defineNuxtPlugin((nuxtApp) => {
  const { initLocale } = useLocale()
  nuxtApp.hook('app:suspense:resolve', () => {
    initLocale()
  })
})
