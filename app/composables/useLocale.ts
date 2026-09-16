// 사이트 전체 언어 전환(한글/EN). 별도 번역 키 파일 없이, 호출부에서 t(한글, 영문)로
// 두 버전을 같이 넘기는 방식 — 기존 한글 텍스트 위주 코드베이스에 최소 침습적으로 적용하기 위함.
export type Locale = 'ko' | 'en'
const LOCALE_STORAGE_KEY = 'bitduck_locale'

export function useLocale() {
  const locale = useState<Locale>('locale', () => 'ko')

  function setLocale(l: Locale) {
    locale.value = l
    if (process.client) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, l)
      } catch {
        // ignore
      }
    }
  }

  function toggleLocale() {
    setLocale(locale.value === 'ko' ? 'en' : 'ko')
  }

  function initLocale() {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (saved === 'en' || saved === 'ko') locale.value = saved
    } catch {
      // ignore
    }
  }

  function t(ko: string, en: string) {
    return locale.value === 'en' ? en : ko
  }

  return { locale, setLocale, toggleLocale, initLocale, t }
}
