<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-xl font-semibold">로그인</h1>
    <p class="mt-1 text-sm text-slate-400">메인 사이트 로그인</p>

    <form class="mt-6 space-y-3" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">아이디</label>
        <input v-model.trim="username" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="text-sm text-slate-300">비밀번호</label>
        <input v-model="password" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="loading"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        <span>{{ loading ? '로그인 중...' : '로그인' }}</span>
      </button>
      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    </form>

    <div class="mt-4 text-sm text-slate-400">
      계정이 없나요?
      <NuxtLink to="/auth/register" class="text-indigo-300 hover:underline">회원가입</NuxtLink>
    </div>
  </div>

  <!-- 전체 화면 로딩 오버레이 -->
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="loading"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="w-[320px] rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/25 border-t-cyan-300" />
            <div>
              <div class="text-sm font-semibold text-slate-100">{{ loadingTitle }}</div>
              <div class="mt-1 text-xs text-slate-400">{{ loadingDesc }}</div>
            </div>
          </div>
          <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div class="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-cyan-400/70" />
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const { refresh } = useMe()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const loadingTitle = ref('접속 중입니다...')
const loadingDesc = ref('인증 정보를 확인하고 있습니다.')

async function onSubmit() {
  loading.value = true
  error.value = null
  loadingTitle.value = '접속 중입니다...'
  loadingDesc.value = '서버에 연결하고 있습니다.'
  try {
    // 1) 로그인
    await $fetch('/api/auth/login', { method: 'POST', body: { username: username.value, password: password.value } })

    // 2) 세션/유저 갱신
    loadingTitle.value = '인증 확인 중입니다...'
    loadingDesc.value = '세션을 적용하고 있습니다.'
    await refresh()

    // 3) 이동
    loadingTitle.value = '거래소로 이동 중입니다...'
    loadingDesc.value = '잠시만 기다려주세요.'
    await navigateTo('/exchange/SAMSUNGUSDT')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes progress {
  0% {
    transform: translateX(-120%);
  }
  50% {
    transform: translateX(180%);
  }
  100% {
    transform: translateX(420%);
  }
}
</style>
