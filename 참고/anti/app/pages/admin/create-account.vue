<template>
  <div class="space-y-6 max-w-4xl mx-auto py-4">
    <!-- 뒤로가기 버튼 -->
    <div>
      <NuxtLink to="/admin" class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
        <span>← 대시보드로 돌아가기</span>
      </NuxtLink>
    </div>

    <!-- 지사(관리자) 계정 생성 -->
    <div class="rounded-2xl border border-white/5 bg-[#0f1423] p-6 shadow-xl">
      <h2 class="font-bold text-lg text-white">지사(관리자) 계정 생성</h2>
      <p class="mt-1 text-sm text-slate-400">총관리자만 생성 가능하며, 생성된 부어드민 계정의 권한을 제어할 수 있습니다.</p>

      <form class="mt-6 space-y-4 max-w-md" @submit.prevent="createBranch">
        <div>
          <label class="text-sm text-slate-300 font-medium">지사 아이디</label>
          <input 
            v-model.trim="bUser" 
            placeholder="예: branch_admin1"
            class="mt-1.5 w-full rounded-lg bg-[#e8efff] text-slate-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans border border-slate-300" 
          />
        </div>
        <div>
          <label class="text-sm text-slate-300 font-medium">비밀번호</label>
          <input 
            v-model="bPass" 
            type="password" 
            placeholder="비밀번호 입력"
            class="mt-1.5 w-full rounded-lg bg-[#e8efff] text-slate-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-sans border border-slate-300" 
          />
        </div>
        <div class="pt-2">
          <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input v-model="canCredit" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            가상 입금 권한 부여 (canCredit)
          </label>
        </div>
        <div class="pt-4">
          <button 
            class="w-full rounded-lg bg-[#5352ed] hover:bg-[#3d3ce3] py-2.5 text-sm font-semibold text-white transition duration-150 shadow-md h-[44px] flex items-center justify-center" 
            :disabled="creating"
          >
            지사 계정 생성하기
          </button>
        </div>
      </form>
      <p v-if="msg" class="mt-3 text-sm text-emerald-300 font-medium">{{ msg }}</p>
      <p v-if="err" class="mt-3 text-sm text-rose-300 font-medium">{{ err }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

const { me, refresh } = useMe()
await refresh()

// 최고관리자가 아니면 대시보드로 리다이렉트
if (me.value?.role !== 'super_admin') {
  await navigateTo('/admin')
}

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
