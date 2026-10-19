// 사이트 테마: 처음(저장된 값이 없을 때)은 화이트(light). 해/달 버튼으로 어두운(dark) 테마와 전환하며 localStorage에 기억한다.
// light는 <html class="theme-light">로 표시하고, 실제 색 반전은 assets/css/main.css의 .theme-light 규칙이 처리한다.
export type ThemeName = 'light' | 'dark'
const THEME_STORAGE_KEY = 'bitduck_theme_v2' // _v2: 예전에 저장된 테마 선택은 무시하고 모두 화이트로 새로 시작

export function useTheme() {
  const theme = useState<ThemeName>('theme', () => 'light')

  function apply(t: ThemeName) {
    if (!process.client) return
    document.documentElement.classList.toggle('theme-light', t === 'light')
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
    document.documentElement.classList.toggle('theme-light', theme.value === 'light')
  }

  return { theme, setTheme, toggleTheme, initTheme }
}
