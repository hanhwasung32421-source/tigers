<template>
  <div class="font-noto-kr min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.08),transparent_20%),linear-gradient(180deg,#010811,#02121d_40%,#010811)] text-slate-100">
    <header class="sticky top-0 z-50 border-b border-cyan-500/10 bg-[#020b16]/92 backdrop-blur">
      <div class="mx-auto flex max-w-[1920px] items-center justify-between gap-3 px-3 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight text-white">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-1 text-sm text-slate-300">
          <NuxtLink to="/" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">홈</NuxtLink>
          <NuxtLink to="/exchange/DOGEUSDT" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">선물거래</NuxtLink>
          <NuxtLink to="/wallet" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">내 지갑</NuxtLink>
          <NuxtLink to="/invest/balance" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">투자내역</NuxtLink>
          <NuxtLink to="/support" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">고객센터</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin" class="rounded-md px-3 py-1.5 hover:bg-cyan-400/10 hover:text-white">관리자</NuxtLink>
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

    <main class="mx-auto max-w-[1920px] px-3 py-3">
      <slot />
    </main>
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
