<template>
  <div class="font-noto-kr min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.08),transparent_20%),linear-gradient(180deg,#010811,#02121d_40%,#010811)] text-slate-100">
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
    <header class="sticky top-0 z-50 border-b border-cyan-500/10 bg-[#020b16]/92 backdrop-blur">
      <div class="mx-auto flex max-w-[1920px] items-center justify-between gap-3 px-3 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight text-white" @click="startNavLoading('/')">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-1 text-sm text-slate-300">
          <NuxtLink to="/" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/')">홈</NuxtLink>
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/exchange/SAMSUNGUSDT')">선물거래</NuxtLink>
          <NuxtLink to="/wallet" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/wallet')">내 지갑</NuxtLink>
          <NuxtLink to="/invest/balance" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/invest/balance')">투자내역</NuxtLink>
          <NuxtLink to="/support" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/support')">고객센터</NuxtLink>
          <div v-if="isAdmin" class="group relative">
            <NuxtLink to="/admin" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin')">관리자</NuxtLink>
            <div class="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div class="min-w-[160px] rounded-xl border border-cyan-500/10 bg-[#03101d] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                <NuxtLink to="/admin/members" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/members')">회원 목록</NuxtLink>
                <NuxtLink to="/admin/online" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/online')">실시간 접속</NuxtLink>
                <NuxtLink to="/admin/trades" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/trades')">거래 내역</NuxtLink>
                <NuxtLink to="/admin/transfers" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/transfers')">입출금 내역</NuxtLink>
                <NuxtLink to="/admin/positions" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white" @click="startNavLoading('/admin/positions')">포지션 목록</NuxtLink>
              </div>
            </div>
          </div>
        </nav>

        <div class="flex items-center gap-2 text-sm">
          <span class="hidden sm:inline rounded-md border border-cyan-500/10 bg-cyan-500/5 px-2 py-1 text-xs font-mono text-slate-300">
            {{ appVersion }}
          </span>
          <template v-if="me">
            <span class="hidden sm:inline text-slate-300">{{ me.username }}</span>
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

    <main class="mx-auto max-w-[1920px] px-3 py-3">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName
const appVersion = config.public.appVersion
const route = useRoute()
const navLoading = useState<boolean>('global_nav_loading', () => false)

const { me, refresh } = useMe()
await refresh()

const isAdmin = computed(() => me.value?.role === 'super_admin' || me.value?.role === 'branch_admin')

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
  await refresh()
  await navigateTo('/')
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
