<template>
  <div class="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.08),transparent_32%),linear-gradient(180deg,#020817,#03111f_45%,#020817)] text-slate-100">
    <header class="sticky top-0 z-50 border-b border-cyan-500/10 bg-[#020b16]/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-white">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-1 text-sm text-slate-300">
          <NuxtLink to="/exchange/DOGEUSDT" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">선물거래</NuxtLink>
          <NuxtLink to="/wallet" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">내 지갑</NuxtLink>
          <NuxtLink to="/invest/balance" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">투자내역</NuxtLink>
          <NuxtLink to="/support" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">고객센터</NuxtLink>
          <div v-if="isAdmin" class="group relative">
            <NuxtLink to="/admin" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">관리자</NuxtLink>
            <div class="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div class="min-w-[160px] rounded-xl border border-cyan-500/10 bg-[#03101d] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                <NuxtLink to="/admin/members" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white">회원 목록</NuxtLink>
                <NuxtLink to="/admin/online" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white">실시간 접속</NuxtLink>
                <NuxtLink to="/admin/trades" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white">거래 내역</NuxtLink>
                <NuxtLink to="/admin/transfers" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white">입출금 내역</NuxtLink>
                <NuxtLink to="/admin/positions" class="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-cyan-400/10 hover:text-white">포지션 목록</NuxtLink>
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
            <NuxtLink to="/auth/login" class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">로그인</NuxtLink>
            <NuxtLink to="/auth/register" class="rounded-md bg-[#1d4ed8] px-3 py-1.5 text-white hover:bg-[#2563eb]">가입</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>

    <footer class="mx-auto max-w-6xl border-t border-cyan-500/10 px-4 pb-10 pt-6 text-xs text-slate-500">
      © {{ appName }}. 본 플랫폼의 거래 서비스는 규정 준수 하에 제공됩니다.
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName
const appVersion = config.public.appVersion

const { me, refresh } = useMe()
await refresh()

const isAdmin = computed(() => me.value?.role === 'super_admin' || me.value?.role === 'branch_admin')

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await refresh()
  await navigateTo('/')
}
</script>
