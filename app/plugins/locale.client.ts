// 저장된 언어 설정(localStorage)을 앱 시작 시 한 번 복원한다.
export default defineNuxtPlugin(() => {
  const { initLocale } = useLocale()
  initLocale()
})
