<template>
  <div class="relative flex items-center gap-0.5 text-slate-300">
    <!-- 언어(지구본) -->
    <button
      ref="langBtn"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      :class="langOpen ? 'bg-white/10 text-white' : ''"
      aria-label="Language"
      @click="toggleLang"
    >
      <svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" />
      </svg>
    </button>

    <!-- 테마(해/달) -->
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      :aria-label="theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'"
      @click="toggleTheme"
    >
      <span v-if="!mounted" class="block h-[19px] w-[19px]" />
      <svg v-else-if="theme === 'light'" viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    </button>

    <!-- 알림(종) -->
    <NuxtLink
      v-if="me && showBell"
      :to="bellTarget"
      class="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      aria-label="Notifications"
    >
      <svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      <span v-if="unread > 0" class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#020b16]" />
    </NuxtLink>

    <!-- 첫 화면 배경 영상의 흰 필터 농도 조절(총관리자만, 첫 화면에서만). 평소엔 거의 보이지 않게 투명하다. -->
    <div v-if="showWashControl && isSuperAdmin && isHome" class="absolute right-0 top-[44px] z-[60] flex flex-col items-end">
      <button
        type="button"
        class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 opacity-25 transition hover:opacity-90"
        aria-label="Background filter"
        @click="washOpen = !washOpen"
      >
        <svg viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" />
        </svg>
      </button>
      <div v-if="washOpen" class="mt-1 flex items-center gap-1 rounded-full border border-white/10 bg-[#0b1220] px-2 py-1 text-[13px] text-slate-200 shadow-lg">
        <button type="button" class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[16px] leading-none hover:bg-white/10" aria-label="Lighter" @click="setWash(heroWash - 5)">−</button>
        <span class="w-11 text-center font-semibold tabular-nums">{{ heroWash }}%</span>
        <button type="button" class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[16px] leading-none hover:bg-white/10" aria-label="Stronger" @click="setWash(heroWash + 5)">+</button>
      </div>
    </div>

    <!-- 언어 목록: 헤더(overflow/stacking)에 가려지지 않도록 body에 띄운다 -->
    <Teleport to="body">
      <div
        v-if="langOpen"
        ref="langPanel"
        class="lang-panel fixed z-[200] w-[420px] max-w-[calc(100vw-16px)] rounded-xl border border-white/10 bg-[#0b1220] py-4 text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
      >
        <div class="grid max-h-[80vh] grid-cols-2 overflow-y-auto">
          <div>
            <div class="px-4 pb-2 text-center text-[15px] font-semibold text-slate-500">Language</div>
            <button
              v-for="l in LANGUAGES"
              :key="l.code"
              type="button"
              class="block h-[46px] w-full px-4 text-center text-[15px] hover:bg-white/5"
              :class="lang === l.code ? 'font-bold text-amber-400' : 'text-slate-200'"
              @click="pick(l.code)"
            >
              {{ l.label }}
            </button>
          </div>
          <div class="border-l border-white/10">
            <div class="px-4 pb-2 text-center text-[15px] font-semibold text-slate-500">Currency</div>
            <button
              v-for="c in CURRENCIES"
              :key="c"
              type="button"
              class="block h-[46px] w-full px-4 text-center text-[15px] hover:bg-white/5"
              :class="currency === c ? 'font-bold text-amber-400' : 'text-slate-200'"
              @click="pickCurrency(c)"
            >
              {{ c }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ bellTarget?: string; showBell?: boolean; showWashControl?: boolean }>(), { bellTarget: '/support', showBell: true, showWashControl: false })

const { me } = useMe()
const { unread } = useMessages()
const { lang, setLang } = useLocale()
const userLangChanges = useState<number>('user_lang_changes', () => 0)
const { theme, toggleTheme } = useTheme()

// 통화 선택은 화면에만 기억해 둔다(거래소의 가격/잔액은 모두 USDT 기준이라 실제 환산은 하지 않는다).
const CURRENCIES = ['USD', 'CNY', 'RUB', 'JPY', 'EUR', 'VND', 'THB', 'BRL', 'TWD', 'HKD', 'MXN']
const CURRENCY_KEY = 'bitduck_currency_v2'
const currency = useState<string>('currency', () => 'USD')
function pickCurrency(c: string) {
  currency.value = c
  try {
    localStorage.setItem(CURRENCY_KEY, c)
  } catch {
    // ignore
  }
  langOpen.value = false
}

// 첫 화면 배경 영상 흰 필터 농도(총관리자가 +/-로 조절, Supabase에 저장되어 모든 방문자에게 같게 적용)
const route = useRoute()
const isHome = computed(() => route.path === '/')
const isSuperAdmin = computed(() => me.value?.role === 'super_admin')
const heroWash = useState<number>('hero_wash', () => 55)
const washOpen = ref(false)
let washTimer: any = null
function setWash(n: number) {
  const v = Math.min(100, Math.max(0, Math.round(n)))
  heroWash.value = v // 화면에는 바로 반영
  if (washTimer) clearTimeout(washTimer)
  washTimer = setTimeout(async () => {
    try {
      await $fetch('/api/admin/hero-wash', { method: 'POST', body: { percent: v } })
    } catch (e: any) {
      alert(e?.data?.statusMessage || '필터 농도를 저장하지 못했습니다.')
    }
  }, 500)
}

const mounted = ref(false)
const langOpen = ref(false)
const langBtn = ref<HTMLElement | null>(null)
const langPanel = ref<HTMLElement | null>(null)
const panelPos = ref({ top: 0, left: 0 })

function toggleLang() {
  if (langOpen.value) {
    langOpen.value = false
    return
  }
  const r = langBtn.value?.getBoundingClientRect()
  if (r) panelPos.value = { top: r.bottom + 8, left: Math.max(8, Math.min(r.right - 420, window.innerWidth - 428)) }
  langOpen.value = true
}

async function pick(code: any) {
  await setLang(code)
  // 사용자가 직접 언어를 바꿨다는 신호(첫 화면의 안내 팝업이 '다시보지않기'를 눌렀어도 한 번 더 뜨게 한다)
  userLangChanges.value += 1
  langOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!langOpen.value) return
  const t = e.target as Node
  if (langBtn.value?.contains(t) || langPanel.value?.contains(t)) return
  langOpen.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') langOpen.value = false
}

onMounted(() => {
  mounted.value = true
  try {
    const c = localStorage.getItem(CURRENCY_KEY)
    if (c && CURRENCIES.includes(c)) currency.value = c
  } catch {
    // ignore
  }
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>
