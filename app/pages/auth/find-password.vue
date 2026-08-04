<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-xl font-semibold">비밀번호 찾기</h1>
    <p class="mt-1 text-sm text-slate-400">아이디, 이름, 생년월일을 입력하면 운영자에게 초기화 요청 쪽지가 전송됩니다.</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">아이디</label>
        <input v-model.trim="username" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="text-sm text-slate-300">이름</label>
        <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="text-sm text-slate-300">생년월일</label>
        <input v-model.trim="birthDate" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500" />
      </div>
      <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:opacity-60" :disabled="loading">
        {{ loading ? '요청 전송 중...' : '비밀번호 초기화 요청' }}
      </button>
      <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      <p v-if="okText" class="text-sm text-emerald-300">{{ okText }}</p>
    </form>

    <div class="mt-5 flex items-center justify-between text-sm text-slate-400">
      <NuxtLink to="/auth/login" class="underline underline-offset-4 hover:text-indigo-300">로그인으로 돌아가기</NuxtLink>
      <NuxtLink to="/auth/register" class="underline underline-offset-4 hover:text-indigo-300">회원가입</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = ref('')
const name = ref('')
const birthDate = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null
  okText.value = null
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        username: username.value,
        name: name.value,
        birthDate: birthDate.value
      }
    })
    okText.value = '운영자에게 비밀번호 초기화 요청을 보냈습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '초기화 요청에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>
