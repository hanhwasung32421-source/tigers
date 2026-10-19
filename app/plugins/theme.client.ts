// 저장된 테마(localStorage)를 앱 시작 직후 복원한다. 저장값이 없으면 화이트(light).
// 첫 화면('/')과 다른 페이지는 화이트를 그리는 방식이 달라서, 페이지를 옮길 때마다 클래스를 다시 맞춘다.
export default defineNuxtPlugin(() => {
  const { theme, initTheme } = useTheme()
  initTheme()
  useRouter().afterEach(() => {
    applyThemeClasses(theme.value === 'light')
  })
})
