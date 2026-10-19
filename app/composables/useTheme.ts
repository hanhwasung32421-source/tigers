// 사이트 테마: 처음(저장된 값이 없을 때)은 화이트(light). 해/달 버튼으로 어두운(dark) 테마와 전환하며 localStorage에 기억한다.
// light는 <html class="theme-light">로 표시하고, 실제 색 반전은 assets/css/main.css의 .theme-light 규칙이 처리한다.
export type ThemeName = 'light' | 'dark'
const THEME_STORAGE_KEY = 'bitduck_theme_v2' // _v2: 예전에 저장된 테마 선택은 무시하고 모두 화이트로 새로 시작

// 화이트 테마는 두 가지 방식으로 그린다.
// - theme-native: 첫 화면('/')과 헤더/푸터. 필터 없이 실제 색(포커스 색 #f0b90b 등)으로 칠한다.
// - theme-filter: 나머지 페이지. 어두운 화면을 반전(invert)해서 화이트로 만든다(반전 필터로는 #f0b90b 같은 선명한 노랑을 정확히 낼 수 없다).
export function applyThemeClasses(light: boolean) {
  const el = document.documentElement
  const home = location.pathname === '/'
  el.classList.toggle('theme-light', light)
  el.classList.toggle('theme-native', light && home)
  el.classList.toggle('theme-filter', light && !home)
}

export function useTheme() {
  const theme = useState<ThemeName>('theme', () => 'light')

  function apply(t: ThemeName) {
    if (!process.client) return
    applyThemeClasses(t === 'light')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t)
    } catch {
      // ignore
    }
  }

  function setTheme(t: ThemeName) {
    theme.value = t
    apply(t)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function initTheme() {
    if (!process.client) return
    let saved: string | null = null
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      // ignore
    }
    theme.value = saved === 'dark' ? 'dark' : 'light'
    applyThemeClasses(theme.value === 'light')
  }

  return { theme, setTheme, toggleTheme, initTheme }
}
