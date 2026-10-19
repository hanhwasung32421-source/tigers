// 저장된 테마(localStorage)를 앱 시작 직후 복원한다. 저장값이 없으면 화이트(light).
export default defineNuxtPlugin(() => {
  useTheme().initTheme()
})
