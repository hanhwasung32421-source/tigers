<template>
  <div class="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.08),transparent_32%),linear-gradient(180deg,#020817,#03111f_45%,#020817)] text-slate-100">
    <Transition name="nav-loading-fade">
      <div v-if="navLoading" class="fixed inset-0 z-[120] flex items-center justify-center bg-[#020817]/55 backdrop-blur-[2px]">
        <div class="rounded-2xl border border-cyan-400/15 bg-[#07111b]/90 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />
            <span class="text-sm font-medium text-slate-100">불러오는 중...</span>
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
    <header class="sticky top-0 z-50 border-b border-cyan-500/10 bg-[#020b16]/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-white" @click="startNavLoading('/')">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-1 text-sm text-slate-300">
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/exchange/SAMSUNGUSDT')">선물거래</NuxtLink>
          <NuxtLink to="/wallet" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/wallet')">내 지갑</NuxtLink>
          <NuxtLink to="/invest/balance" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/invest/balance')">투자내역</NuxtLink>
          <NuxtLink :to="supportTarget" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading(supportTarget)">고객센터</NuxtLink>
          <div v-if="isAdmin" class="group relative">
            <NuxtLink :to="adminHomeTarget" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading(adminHomeTarget)">관리자</NuxtLink>
            <div class="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div class="min-w-[160px] rounded-xl border border-cyan-500/10 bg-[#03101d] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                <button
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white"
                  @click="copyReferralLink"
                >
                  {{ referralLinkCopied ? '복사됨!' : '추천가입링크 복사' }}
                </button>
                <NuxtLink v-if="canViewAdminMenu('members')" to="/admin/members" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/members')">회원 목록</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('online')" to="/admin/online" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/online')">실시간 접속</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('trades')" to="/admin/trades" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/trades')">거래 내역</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('positions')" to="/admin/positions" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/positions')">포지션 목록</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('messages')" to="/admin/messages" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/messages')">쪽지관리</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('settlement')" to="/admin/settlement" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/settlement')">정산내역</NuxtLink>
                <NuxtLink v-if="canViewAdminMenu('deposits')" to="/admin/deposits" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/deposits')">입금/출금 내역</NuxtLink>
              </div>
            </div>
          </div>
        </nav>

        <div class="flex items-center gap-2 text-sm">
          <span class="hidden sm:inline rounded-md border border-cyan-500/10 bg-cyan-500/5 px-2 py-1 text-xs font-mono text-slate-300">
            {{ appVersion }}
          </span>
          <template v-if="me">
            <NuxtLink to="/profile" class="hidden sm:inline text-slate-300 underline-offset-4 hover:text-white hover:underline" @click="startNavLoading('/profile')">
              {{ me.name || me.username }}
            </NuxtLink>
            <NuxtLink
              :to="bellTarget"
              class="relative rounded-md border px-3 py-1.5 transition"
              :class="unread > 0 ? 'border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/20' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="startNavLoading(bellTarget)"
            >
              <span>🔔</span>
              <span
                v-if="unread > 0"
                class="absolute -right-1.5 -top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-900"
              >
                {{ unread }}
              </span>
            </NuxtLink>
            <button class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" @click="logout">
              로그아웃
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10" @click="startNavLoading('/auth/login')">로그인</NuxtLink>
            <NuxtLink to="/auth/register" class="rounded-md bg-[#1d4ed8] px-3 py-1.5 text-white hover:bg-[#2563eb]" @click="startNavLoading('/auth/register')">가입</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>

    <Teleport to="body">
      <div v-if="showResetNotice" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4">
        <div class="w-full max-w-md rounded-2xl border border-amber-400/20 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <h2 class="text-lg font-semibold text-slate-100">비밀번호 안내</h2>
          <p class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">비밀번호가 초기화 되었습니다.
우측상단 아이디를 클릭하여 비밀번호를 변경해주세요</p>
          <div class="mt-5 flex justify-end">
            <button class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15" @click="dismissResetNotice">다시보지않기</button>
          </div>
        </div>
      </div>
    </Teleport>

    <footer class="mx-auto max-w-6xl border-t border-cyan-500/10 px-4 pb-10 pt-6 text-xs text-slate-500">
      © {{ appName }}. 본 플랫폼의 거래 서비스는 규정 준수 하에 제공됩니다.
    </footer>

    <AdminErrorConsole />
  </div>
</template>

<script setup lang="ts">
import { IMPERSONATE_STORAGE_KEY } from '../plugins/impersonation.client'

const config = useRuntimeConfig()
const appName = config.public.appName
const { data: versionData } = await useFetch<{ date: string; build: number }>('/api/version', { key: 'app-version' })
const route = useRoute()
const navLoading = useState<boolean>('global_nav_loading', () => false)

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

const isAdmin = computed(() => me.value?.role === 'super_admin' || me.value?.role === 'branch_admin')
// 관리자 대시보드(/admin)는 총관리자 전용. 부관리자는 회원 목록으로 바로 이동.
const adminHomeTarget = computed(() => (me.value?.role === 'super_admin' ? '/admin' : '/admin/members'))
function canViewAdminMenu(key: string) {
  if (me.value?.role === 'super_admin') return true
  return (me.value as any)?.permissions?.menus?.[key]?.view !== false
}
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

watch(
  () => route.fullPath,
  () => {
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
