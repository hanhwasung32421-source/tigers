<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">관리자 대시보드</h1>
      <p class="mt-2 text-sm text-slate-400">
        유저 목록 확인, 가상 USDT 입금, (추후) 지사 계정 생성/권한 제어를 여기서 확장합니다.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink to="/admin/users" class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15">유저/입금 관리</NuxtLink>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="text-sm text-slate-400">현재 로그인</div>
      <div class="mt-1 font-medium">{{ me?.username }} ({{ me?.role }})</div>
    </div>

    <div v-if="me?.role === 'super_admin'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="font-semibold">지사(관리자) 계정 생성</h2>
      <p class="mt-1 text-sm text-slate-400">총관리자만 생성 가능. 권한에 따라 메뉴/기능을 제한할 수 있게 확장합니다.</p>

      <form class="mt-4 grid gap-3 sm:grid-cols-3" @submit.prevent="createBranch">
        <div>
          <label class="text-sm text-slate-300">지사 아이디</label>
          <input v-model.trim="bUser" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="text-sm text-slate-300">비밀번호</label>
          <input v-model="bPass" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
        <div class="flex items-end">
          <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400" :disabled="creating">
            생성
          </button>
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-300 sm:col-span-3">
          <input v-model="canCredit" type="checkbox" class="h-4 w-4" />
          가상 입금 권한(canCredit)
        </label>
      </form>
      <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      <p v-if="err" class="mt-3 text-sm text-rose-300">{{ err }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })
const { me, refresh } = useMe()
await refresh()

const bUser = ref('')
const bPass = ref('')
const canCredit = ref(false)
const creating = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)

async function createBranch() {
  creating.value = true
  msg.value = null
  err.value = null
  try {
    await $fetch('/api/admin/branches/create', {
      method: 'POST',
      body: {
        username: bUser.value,
        password: bPass.value,
        permissions: { canViewUsers: true, canCredit: canCredit.value }
      }
    })
    msg.value = '지사 계정이 생성되었습니다.'
    bUser.value = ''
    bPass.value = ''
    canCredit.value = false
  } catch (e: any) {
    err.value = e?.data?.statusMessage || '생성 실패'
  } finally {
    creating.value = false
  }
}
</script>
