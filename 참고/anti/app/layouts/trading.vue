<template>
  <div class="min-h-dvh">
    <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div class="mx-auto flex max-w-[1920px] items-center justify-between gap-3 px-3 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-1 text-sm">
          <NuxtLink to="/" class="rounded-md px-3 py-1 hover:bg-white/10">홈</NuxtLink>
          <NuxtLink to="/exchange/DOGEUSDT" class="rounded-md px-3 py-1 hover:bg-white/10">선물거래</NuxtLink>
          <NuxtLink to="/wallet" class="rounded-md px-3 py-1 hover:bg-white/10">내 지갑</NuxtLink>
          <NuxtLink to="/invest/balance" class="rounded-md px-3 py-1 hover:bg-white/10">투자내역</NuxtLink>
          <NuxtLink to="/support" class="rounded-md px-3 py-1 hover:bg-white/10">고객센터</NuxtLink>
          <NuxtLink v-if="me && (me.role === 'super_admin' || me.role === 'branch_admin')" to="/admin" class="rounded-md px-3 py-1 hover:bg-white/10">관리자</NuxtLink>
        </nav>

        <div class="flex items-center gap-2 text-sm">
          <span class="hidden sm:inline rounded-md bg-white/5 px-2 py-1 text-xs font-mono text-slate-300 ring-1 ring-white/10">
            v{{ appVersion }}
          </span>
          <template v-if="me">
            <span class="hidden sm:inline text-slate-300">{{ me.username }}</span>
            <button class="rounded-md bg-white/10 px-3 py-1 hover:bg-white/15" @click="logout">
              로그아웃
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="rounded-md bg-white/10 px-3 py-1 hover:bg-white/15">로그인</NuxtLink>
            <NuxtLink to="/auth/register" class="rounded-md bg-indigo-500 px-3 py-1 hover:bg-indigo-400">가입</NuxtLink>
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

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await refresh()
  await navigateTo('/')
}
</script>

