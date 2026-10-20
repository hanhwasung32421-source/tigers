// 저장된 테마(localStorage)를 앱 시작 직후 복원한다. 저장값이 없으면 화이트(light).
// 첫 화면/로그인/마켓 등(필터 없이 그림)과 나머지 페이지(반전 필터로 그림)는 화이트를 그리는 방식이 달라서 페이지를 옮길 때 클래스를 다시 맞춘다.
// 이때 "주소가 바뀌는 순간"이 아니라 "새 페이지가 실제로 화면에 그려진 뒤(page:finish)"에 맞춘다.
// 주소가 바뀌는 순간에 바꾸면, 새 페이지를 불러오는 동안 아직 화면에 있는 이전 페이지가 필터를 잃고 어두운 원래 색으로 번쩍 보인다.
export default defineNuxtPlugin((nuxtApp) => {
  const { theme, initTheme } = useTheme()
  initTheme()
  nuxtApp.hook('page:finish', () => {
    applyThemeClasses(theme.value === 'light')
  })
})
