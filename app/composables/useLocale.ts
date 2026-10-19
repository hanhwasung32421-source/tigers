// 사이트 전체 언어 전환. 호출부는 계속 t(한글, 영문)로 두 문장을 같이 넘기고,
// - 한국어: 한글 문장, 영어: 영문 문장을 그대로 쓰며
// - 그 밖의 언어(일본어/베트남어/러시아어/…)는 "영문 문장"을 키로 하는 번역 사전(app/i18n/<코드>.json)에서 찾는다.
//   사전에 없는 문장(숫자/종목명이 끼어 있는 동적 문장 등)은 영어로 대신 보여준다.
// 사전은 그 언어를 고를 때만 불러온다(번들 크기 절약).
export type Locale = 'ko' | 'en'
export type LangCode = 'ko' | 'en' | 'ja' | 'vi' | 'ru' | 'th' | 'es' | 'pt-PT' | 'pt-BR' | 'zh-CN' | 'zh-TW'

export const LANGUAGES: Array<{ code: LangCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ru', label: 'Русский' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'es', label: 'Español' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' }
]

// 키 이름에 _v2를 붙여, 예전에 저장돼 있던 언어 선택(bitduck_lang / bitduck_locale)은 더 이상 읽지 않는다.
// 기존 방문자도 처음 한 번은 영어로 시작하고, 거기서 다시 고른 언어부터 새로 기억된다.
const LANG_STORAGE_KEY = 'bitduck_lang_v2'
const KNOWN = new Set<string>(LANGUAGES.map((l) => l.code))

export function useLocale() {
  // locale: 날짜/숫자 서식 등 기존 코드가 쓰는 'ko' | 'en' 구분(한국어 외에는 모두 'en' 취급)
  const locale = useState<Locale>('locale', () => 'en')
  const lang = useState<LangCode>('lang', () => 'en')
  const dicts = useState<Record<string, Record<string, string>>>('i18n_dicts', () => ({}))

  async function ensureDict(code: string) {
    if (code === 'ko' || code === 'en' || dicts.value[code]) return
    try {
      const mod: any = await import(`../i18n/${code}.json`)
      dicts.value = { ...dicts.value, [code]: (mod.default || mod) as Record<string, string> }
    } catch {
      // 사전을 못 불러오면 영어로 대신 보여준다
    }
  }

  async function setLang(code: LangCode) {
    await ensureDict(code)
    lang.value = code
    locale.value = code === 'ko' ? 'ko' : 'en'
    if (process.client) {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, code)
        document.documentElement.lang = code
      } catch {
        // ignore
      }
    }
  }

  function setLocale(l: Locale) {
    return setLang(l)
  }

  function toggleLocale() {
    return setLang(lang.value === 'ko' ? 'en' : 'ko')
  }

  function initLocale() {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY)
      if (saved && KNOWN.has(saved)) setLang(saved as LangCode)
    } catch {
      // ignore
    }
  }

  function t(ko: string, en: string) {
    const l = lang.value
    if (l === 'ko') return ko
    if (l === 'en') return en
    return dicts.value[l]?.[en] ?? en
  }

  return { locale, lang, setLang, setLocale, toggleLocale, initLocale, t }
}
