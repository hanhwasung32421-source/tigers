<template>
  <div class="site-bg min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.08),transparent_32%),linear-gradient(180deg,#020817,#03111f_45%,#020817)] text-slate-100">
    <Transition name="nav-loading-fade">
      <div v-if="navLoading" class="fixed inset-0 z-[120] flex items-center justify-center bg-[#020817]/55 backdrop-blur-[2px]">
        <div class="rounded-2xl border border-cyan-400/15 bg-[#07111b]/90 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />
            <span class="text-sm font-medium text-slate-100">{{ t('불러오는 중...', 'Loading...') }}</span>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="nav-loading-fade">
      <div v-if="toast?.visible" class="fixed inset-x-0 top-3 z-[130] flex justify-center px-4">
        <div class="flex items-center gap-2 rounded-full border border-amber-400/30 bg-[#0b1220]/95 px-4 py-2 text-sm text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          <span>🔔</span>
          <span>{{ toast.text }}</span>
        </div>
      </div>
    </Transition>
    <header class="site-header font-landing sticky top-0 z-50 border-b border-cyan-500/10 bg-[#020b16]/90 backdrop-blur">
      <div class="flex w-full items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
        <div class="flex items-center gap-1">
          <NuxtLink to="/" class="mr-4" @click="startNavLoading('/')">
            <BrandLogo />
          </NuxtLink>

          <nav class="hidden items-center gap-1 text-[15px] text-slate-300 md:flex">
            <template v-for="key in orderedMainNavKeys" :key="key">
              <NuxtLink
                :to="key === 'support' ? supportTarget : MAIN_NAV_ROUTES[key]"
                class="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white"
                @click="startNavLoading(key === 'support' ? supportTarget : MAIN_NAV_ROUTES[key])"
              >
                {{ t(MAIN_NAV_LABELS[key], MAIN_NAV_LABELS_EN[key]) }}
              </NuxtLink>
            </template>
            <div v-if="isAdmin" class="group relative">
              <NuxtLink :to="adminHomeTarget" class="whitespace-nowrap rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading(adminHomeTarget)">{{ t('관리자', 'Admin') }}</NuxtLink>
              <div class="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div class="min-w-[160px] rounded-xl border border-cyan-500/10 bg-[#03101d] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                  <button
                    type="button"
                    class="block w-full rounded-lg px-3 py-2 text-left text-[15px] text-slate-200 hover:bg-cyan-400/10 hover:text-white"
                    @click="copyReferralLink"
                  >
                    {{ referralLinkCopied ? t('복사됨!', 'Copied!') : t('추천가입링크 복사', 'Copy Referral Link') }}
                  </button>
                  <template v-for="key in orderedAdminMenuKeys" :key="key">
                    <NuxtLink
                      v-if="canViewAdminMenu(key)"
                      :to="ADMIN_MENU_ROUTES[key]"
                      class="block rounded-lg px-3 py-2 text-[15px] text-slate-200 hover:bg-cyan-400/10 hover:text-white"
                      @click="startNavLoading(ADMIN_MENU_ROUTES[key])"
                    >
                      {{ t(ADMIN_MENU_LABELS[key], ADMIN_MENU_LABELS_EN[key]) }}
                    </NuxtLink>
                  </template>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div class="flex items-center gap-2 text-[15px]">
          <div class="hidden items-center gap-2 md:flex">
            <span class="hidden whitespace-nowrap rounded-md border border-cyan-500/10 bg-cyan-500/5 px-2 py-1 font-mono text-[13px] text-slate-300 lg:inline">
              {{ appVersion }}
            </span>
            <template v-if="me">
              <NuxtLink to="/profile" class="hidden sm:inline text-slate-300 underline-offset-4 hover:text-white hover:underline" @click="startNavLoading('/profile')">
                {{ me.name || me.username }}
              </NuxtLink>
              <button class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" @click="logout">
                {{ t('로그아웃', 'Log Out') }}
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/auth/login" class="px-2 py-1.5 font-medium text-amber-400 hover:text-amber-300" @click="startNavLoading('/auth/login')">{{ t('로그인', 'Login') }}</NuxtLink>
              <NuxtLink to="/auth/register" class="rounded-lg bg-[#f0b90b] px-5 py-1.5 font-medium text-[#383A3E] hover:bg-[#d9a609]" @click="startNavLoading('/auth/register')">{{ t('회원가입', 'Register') }}</NuxtLink>
            </template>
            <HeaderTools :bell-target="bellTarget" />
          </div>

          <HeaderTools class="md:hidden" :bell-target="bellTarget" />
          <button
            :key="`mobile-menu-btn-${locale}`"
            type="button"
            class="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-slate-200 hover:bg-white/10 md:hidden"
            :aria-label="t('메뉴 열기', 'Open menu')"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span class="block text-base leading-none">{{ mobileMenuOpen ? '✕' : '☰' }}</span>
          </button>
        </div>
      </div>

      <div v-if="mobileMenuOpen" class="site-header border-t border-cyan-500/10 bg-[#020b16] px-4 py-3 md:hidden">
        <nav class="flex flex-col gap-0.5 text-[15px] text-slate-200">
          <NuxtLink
            v-for="key in orderedMainNavKeys"
            :key="key"
            :to="key === 'support' ? supportTarget : MAIN_NAV_ROUTES[key]"
            class="flex items-center gap-2 rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white"
            @click="onMobileNavClick(key === 'support' ? supportTarget : MAIN_NAV_ROUTES[key])"
          >
            {{ t(MAIN_NAV_LABELS[key], MAIN_NAV_LABELS_EN[key]) }}
          </NuxtLink>

          <template v-if="isAdmin">
            <div class="my-2 h-px bg-white/10" />
            <div class="px-3 py-1 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{{ t('관리자', 'Admin') }}</div>
            <NuxtLink :to="adminHomeTarget" class="rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white" @click="onMobileNavClick(adminHomeTarget)">
              {{ t('대시보드', 'Dashboard') }}
            </NuxtLink>
            <button type="button" class="rounded-md px-3 py-2.5 text-left hover:bg-cyan-400/10 hover:text-white" @click="copyReferralLink">
              {{ referralLinkCopied ? t('복사됨!', 'Copied!') : t('추천가입링크 복사', 'Copy Referral Link') }}
            </button>
            <template v-for="key in orderedAdminMenuKeys" :key="key">
              <NuxtLink
                v-if="canViewAdminMenu(key)"
                :to="ADMIN_MENU_ROUTES[key]"
                class="rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white"
                @click="onMobileNavClick(ADMIN_MENU_ROUTES[key])"
              >
                {{ t(ADMIN_MENU_LABELS[key], ADMIN_MENU_LABELS_EN[key]) }}
              </NuxtLink>
            </template>
          </template>

          <div class="my-2 h-px bg-white/10" />
          <template v-if="me">
            <NuxtLink to="/profile" class="rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white" @click="onMobileNavClick('/profile')">
              {{ me.name || me.username }}
            </NuxtLink>
            <button type="button" class="rounded-md px-3 py-2.5 text-left hover:bg-cyan-400/10 hover:text-white" @click="mobileMenuOpen = false; logout()">
              {{ t('로그아웃', 'Log Out') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white" @click="onMobileNavClick('/auth/login')">{{ t('로그인', 'Login') }}</NuxtLink>
            <NuxtLink to="/auth/register" class="rounded-md px-3 py-2.5 hover:bg-cyan-400/10 hover:text-white" @click="onMobileNavClick('/auth/register')">{{ t('회원가입', 'Register') }}</NuxtLink>
          </template>
          <div class="px-3 pt-2 text-[13px] text-slate-500">{{ appVersion }}</div>
        </nav>
      </div>
    </header>

    <main class="mx-auto py-4 md:py-6" :class="route.path.startsWith('/admin') ? 'max-w-none px-3 sm:px-6 lg:px-[150px]' : route.path === '/' ? 'max-w-none px-0' : route.path === '/markets' ? 'max-w-none px-4 md:px-8' : 'max-w-6xl px-4'">
      <slot />
    </main>

    <Teleport to="body">
      <div v-if="showResetNotice" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4">
        <div class="w-full max-w-md rounded-2xl border border-amber-400/20 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <h2 class="text-lg font-semibold text-slate-100">{{ t('비밀번호 안내', 'Password Notice') }}</h2>
          <p class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{{
            t(
              '비밀번호가 초기화 되었습니다.\n우측상단 아이디를 클릭하여 비밀번호를 변경해주세요',
              'Your password has been reset.\nClick your username in the top right to change your password.'
            )
          }}</p>
          <div class="mt-5 flex justify-end">
            <button class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15" @click="dismissResetNotice">{{ t('다시보지않기', "Don't show again") }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <footer :class="route.path === '/' ? 'max-w-none px-6 sm:px-12 md:px-24' : 'max-w-6xl px-4'" class="site-footer font-landing mx-auto border-t border-cyan-500/10 pb-10 pt-8 text-slate-500">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <BrandLogo size="sm" />
        <div class="text-xs text-slate-500">{{ t('거래, 자산, 기회를 하나의 경험으로 연결합니다.', 'Connecting trading, assets, and opportunity in one experience.') }}</div>
      </div>

      <div class="mt-6 grid gap-6 border-t border-white/10 pt-6 text-xs sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <div class="mb-3 font-semibold text-slate-300">{{ t('거래', 'Trading') }}</div>
          <ul class="space-y-2">
            <li><NuxtLink to="/exchange/SAMSUNGUSDT" class="hover:text-white" @click="startNavLoading('/exchange/SAMSUNGUSDT')">{{ t('선물거래', 'Futures Trading') }}</NuxtLink></li>
          </ul>
        </div>
        <div>
          <div class="mb-3 font-semibold text-slate-300">{{ t('자산', 'Assets') }}</div>
          <ul class="space-y-2">
            <li><NuxtLink to="/wallet" class="hover:text-white" @click="startNavLoading('/wallet')">{{ t('지갑 Overview', 'Wallet Overview') }}</NuxtLink></li>
            <li><NuxtLink to="/wallet" class="hover:text-white" @click="startNavLoading('/wallet')">{{ t('입금', 'Deposit') }}</NuxtLink></li>
            <li><NuxtLink to="/wallet" class="hover:text-white" @click="startNavLoading('/wallet')">{{ t('출금', 'Withdraw') }}</NuxtLink></li>
          </ul>
        </div>
        <div>
          <div class="mb-3 font-semibold text-slate-300">{{ t('서비스', 'Services') }}</div>
          <ul class="space-y-2">
            <li><NuxtLink :to="supportTarget" class="hover:text-white" @click="startNavLoading(supportTarget)">{{ t('고객센터', 'Support Center') }}</NuxtLink></li>
            <li><NuxtLink to="/exchange/SAMSUNGUSDT" class="hover:text-white" @click="startNavLoading('/exchange/SAMSUNGUSDT')">{{ t('앱 설치', 'Install App') }}</NuxtLink></li>
          </ul>
        </div>
        <div>
          <div class="mb-3 font-semibold text-slate-300">{{ t('지원', 'Support') }}</div>
          <ul class="space-y-2">
            <li><NuxtLink :to="supportTarget" class="hover:text-white" @click="startNavLoading(supportTarget)">{{ t('고객지원', 'Customer Support') }}</NuxtLink></li>
            <li><NuxtLink to="/profile" class="hover:text-white" @click="startNavLoading('/profile')">{{ t('보안 설정', 'Security Settings') }}</NuxtLink></li>
          </ul>
        </div>
        <div>
          <div class="mb-3 font-semibold text-slate-300">{{ t('법적 고지', 'Legal') }}</div>
          <ul class="space-y-2 text-slate-600">
            <li><NuxtLink to="/legal/terms" class="hover:text-white" @click="startNavLoading('/legal/terms')">{{ t('이용약관', 'Terms of Service') }}</NuxtLink></li>
            <li><NuxtLink to="/legal/privacy" class="hover:text-white" @click="startNavLoading('/legal/privacy')">{{ t('개인정보처리방침', 'Privacy Policy') }}</NuxtLink></li>
          </ul>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-[11px] text-slate-600">
        <span>© {{ new Date().getFullYear() }} <BrandText :text="appName" />. All rights reserved.</span>
        <span>{{ t('거래에는 원금 손실 위험이 있습니다.', 'Trading involves risk of loss of principal.') }}</span>
      </div>
    </footer>

    <AdminErrorConsole />
    <GuestChatWidget />
  </div>
</template>

<script setup lang="ts">
import { IMPERSONATE_STORAGE_KEY } from '../plugins/impersonation.client'

const config = useRuntimeConfig()
const appName = config.public.appName
const { data: versionData } = await useFetch<{ date: string; build: number }>('/api/version', { key: 'app-version' })
const route = useRoute()
const navLoading = useState<boolean>('global_nav_loading', () => false)
const { t, locale } = useLocale()

const { me, refresh } = useMe()
await refresh()

// 빌드 번호(- n)는 총관리자에게만 표시하고, 그 외에는 날짜만 표시한다.
const appVersion = computed(() => {
  if (!versionData.value) return ''
  return me.value?.role === 'super_admin' ? `${versionData.value.date} - ${versionData.value.build}` : versionData.value.date
})
const { unread, toast, refreshUnread, startUnreadPolling, stopUnreadPolling } = useMessages()
const resetNoticeHidden = ref(false)
if (me.value) {
  await refreshUnread()
} else {
  unread.value = 0
}

onMounted(() => {
  if (me.value) startUnreadPolling()
})
onBeforeUnmount(() => {
  stopUnreadPolling()
})

const isAdmin = computed(() => !!me.value?.role && me.value.role !== 'user')
// 관리자 대시보드(/admin)는 총관리자 전용. 부관리자는 회원 목록으로 바로 이동.
const adminHomeTarget = computed(() => (me.value?.role === 'super_admin' ? '/admin' : '/admin/members'))
function canViewAdminMenu(key: string) {
  if (me.value?.role === 'super_admin') return true
  return (me.value as any)?.permissions?.menus?.[key]?.view !== false
}

// 최상단 메인 메뉴(비회원도 봄): 관리자 대시보드의 "메뉴구성" 탭에서 순서/숨김을 설정한다.
type MainNavKey = 'coin' | 'stock' | 'kr' | 'markets' | 'wallet' | 'invest' | 'support'
const MAIN_NAV_ROUTES: Record<MainNavKey, string> = {
  coin: '/exchange/BTCUSDT',
  stock: '/exchange/AAPLUSDT',
  kr: '/exchange/SAMSUNGUSDT',
  markets: '/markets',
  wallet: '/wallet',
  invest: '/invest/balance',
  support: '/support'
}
const MAIN_NAV_LABELS: Record<MainNavKey, string> = {
  coin: '코인선물',
  stock: '파생상품',
  kr: '국내주식',
  markets: '마켓',
  wallet: '내 지갑',
  invest: '투자내역',
  support: '고객센터'
}
const MAIN_NAV_LABELS_EN: Record<MainNavKey, string> = {
  coin: 'Coin Futures',
  stock: 'Derivative',
  kr: 'KR Stocks',
  markets: 'Markets',
  wallet: 'My Wallet',
  invest: 'Investment History',
  support: 'Support'
}
const DEFAULT_MAIN_NAV_ORDER = Object.keys(MAIN_NAV_ROUTES) as MainNavKey[]
const orderedMainNavKeys = ref<MainNavKey[]>(DEFAULT_MAIN_NAV_ORDER.filter((k) => k !== 'invest'))
async function loadMainNavConfig() {
  try {
    const data = await $fetch<{ order: string[]; hidden: string[] }>('/api/nav-menu')
    const known = new Set(DEFAULT_MAIN_NAV_ORDER)
    const fromServer = (data.order || []).filter((k) => known.has(k as MainNavKey)) as MainNavKey[]
    const missing = DEFAULT_MAIN_NAV_ORDER.filter((k) => !fromServer.includes(k))
    const hidden = new Set((data.hidden || []).filter((k) => known.has(k as MainNavKey)))
    orderedMainNavKeys.value = [...fromServer, ...missing].filter((k) => !hidden.has(k))
  } catch {
    // 기본 순서 유지(투자내역은 기본 숨김)
  }
}
await loadMainNavConfig()

const ADMIN_MENU_ROUTES: Record<string, string> = {
  members: '/admin/members',
  online: '/admin/online',
  trades: '/admin/trades',
  positions: '/admin/positions',
  messages: '/admin/messages',
  settlement: '/admin/settlement',
  deposits: '/admin/deposits'
}
const ADMIN_MENU_LABELS: Record<string, string> = {
  members: '회원 목록',
  online: '실시간 접속',
  trades: '거래 내역',
  positions: '포지션 목록',
  messages: '쪽지관리',
  settlement: '정산내역',
  deposits: '입출금 내역'
}
const ADMIN_MENU_LABELS_EN: Record<string, string> = {
  members: 'Members',
  online: 'Online Now',
  trades: 'Trade History',
  positions: 'Positions',
  messages: 'Messages',
  settlement: 'Settlement',
  deposits: 'Deposits/Withdrawals'
}
const DEFAULT_ADMIN_MENU_ORDER = Object.keys(ADMIN_MENU_ROUTES)
const orderedAdminMenuKeys = ref<string[]>([...DEFAULT_ADMIN_MENU_ORDER])
async function loadAdminMenuOrder() {
  if (!isAdmin.value) return
  try {
    // SSR에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
    // 로그인 상태로 조회되어 저장된 순서가 새로고침 직후에도 바로 반영된다.
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ order: string[] }>('/api/admin/menu-order', { headers, credentials: 'include' })
    const known = new Set(DEFAULT_ADMIN_MENU_ORDER)
    const fromServer = (data.order || []).filter((k) => known.has(k))
    const missing = DEFAULT_ADMIN_MENU_ORDER.filter((k) => !fromServer.includes(k))
    orderedAdminMenuKeys.value = [...fromServer, ...missing]
  } catch {
    // 기본 순서 유지
  }
}
if (isAdmin.value) await loadAdminMenuOrder()

const referralLinkCopied = ref(false)
async function copyReferralLink() {
  if (!me.value?.username || !process.client) return
  const link = `${window.location.origin}/auth/register?ref=${encodeURIComponent(me.value.username)}`
  try {
    await navigator.clipboard.writeText(link)
    referralLinkCopied.value = true
    setTimeout(() => {
      referralLinkCopied.value = false
    }, 1500)
  } catch {
    // ignore
  }
}
const supportTarget = computed(() => (isAdmin.value ? '/admin/messages' : '/support'))
const bellTarget = computed(() => (isAdmin.value ? '/admin/messages' : '/support'))
const showResetNotice = computed(
  () =>
    !isAdmin.value &&
    !resetNoticeHidden.value &&
    Boolean(me.value?.password_reset_required) &&
    !me.value?.password_reset_notice_dismissed_at
)

function startNavLoading(target?: string) {
  if (target && String(target) === String(route.path)) return
  navLoading.value = true
}

// 모바일 상단 메뉴(햄버거 버튼으로 여닫는 드롭다운)
const mobileMenuOpen = ref(false)
function onMobileNavClick(target?: string) {
  mobileMenuOpen.value = false
  startNavLoading(target)
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
    setTimeout(() => {
      navLoading.value = false
    }, 180)
  },
  { immediate: true }
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  if (process.client) {
    try {
      sessionStorage.removeItem(IMPERSONATE_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  unread.value = 0
  resetNoticeHidden.value = false
  await refresh()
  await navigateTo('/')
}

async function dismissResetNotice() {
  await $fetch('/api/me/reset-notice-dismiss', { method: 'POST' }).catch(() => {})
  resetNoticeHidden.value = true
  if (me.value) me.value.password_reset_notice_dismissed_at = new Date().toISOString()
}
</script>

<style scoped>
.nav-loading-fade-enter-active,
.nav-loading-fade-leave-active {
  transition: opacity 0.18s ease;
}

.nav-loading-fade-enter-from,
.nav-loading-fade-leave-to {
  opacity: 0;
}
</style>
