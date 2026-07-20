<template>
  <div class="space-y-6 max-w-4xl mx-auto py-4">
    <!-- 대시보드 상단 헤더 & 정보 -->
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#0f1423] p-6 shadow-xl">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-white">관리자 대시보드</h1>
        <p class="mt-1 text-sm text-slate-400">
          현재 계정: <span class="font-mono font-semibold text-slate-200">{{ me?.username }} ({{ me?.role }})</span>
        </p>
      </div>
      <div v-if="me?.role === 'super_admin'">
        <NuxtLink to="/admin/create-account" class="inline-block rounded-lg bg-[#5352ed] hover:bg-[#3d3ce3] text-white px-4 py-2.5 text-sm font-semibold transition shadow-md border border-white/5">
          지사(관리자) 계정 생성
        </NuxtLink>
      </div>
    </div>

    <!-- 유저 및 권한 관리 (대시보드에 바로 노출) -->
    <div class="rounded-2xl border border-white/5 bg-[#0f1423] p-6 shadow-xl">
      <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
        <div>
          <h2 class="text-lg font-bold text-white">유저 및 권한 관리</h2>
          <p class="text-xs text-slate-400 mt-0.5">사용자 역할 설정 및 가상 USDT 잔고를 직접 변경할 수 있습니다.</p>
        </div>
        <button class="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 transition border border-white/5" @click="load">
          새로고침
        </button>
      </div>

      <div v-if="loading" class="text-sm text-slate-400 py-4 text-center">불러오는 중…</div>
      <div v-else class="overflow-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-slate-400 border-b border-white/10">
            <tr>
              <th class="py-3 px-2 font-semibold">ID</th>
              <th class="py-3 px-2 font-semibold">아이디</th>
              <th class="py-3 px-2 font-semibold">역할(권한 변경)</th>
              <th class="py-3 px-2 font-semibold">USDT 잔액 수정</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-t border-white/5 hover:bg-white/5 transition">
              <td class="py-3 px-2 font-mono text-slate-400">{{ u.id }}</td>
              <td class="py-3 px-2 font-semibold text-slate-200">{{ u.username }}</td>
              <td class="py-3 px-2">
                <select 
                  v-model="u.role" 
                  @change="updateRole(u.id, u.role)" 
                  class="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-sans cursor-pointer"
                  :disabled="u.username === 'admin' || (me?.role !== 'super_admin' && u.role === 'super_admin')"
                >
                  <option value="user" class="bg-[#0f1423] text-slate-200 font-sans">일반 유저 (user)</option>
                  <option value="branch_admin" class="bg-[#0f1423] text-slate-200 font-sans">부어드민 (branch_admin)</option>
                  <option value="super_admin" class="bg-[#0f1423] text-slate-200 font-sans" :disabled="me?.role !== 'super_admin'">최고관리자 (super_admin)</option>
                </select>
              </td>
              <td class="py-3 px-2">
                <div class="flex items-center gap-3">
                  <span class="font-mono text-slate-300 w-16 text-right">{{ (u.usdt ?? 0).toFixed(2) }}</span>
                  <input
                    v-model.number="balanceInputs[u.id]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-28 rounded-lg bg-[#e8efff] text-slate-900 px-3 py-1.5 text-xs font-semibold font-mono border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                  <button class="rounded-lg bg-[#5352ed] hover:bg-[#3d3ce3] text-white px-3 py-1.5 text-xs font-bold transition shadow-sm" @click="modifyBalance(u.id)">
                    수정
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-300 font-medium">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

const { me, refresh } = useMe()
await refresh()

type AdminUserRow = { id: number; username: string; role: string; usdt: number; created_at: string }

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const balanceInputs = reactive<Record<number, number>>({})

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    
    // 초기 잔고 값을 입력 인풋에 바인딩
    for (const u of data.users) {
      balanceInputs[u.id] = parseFloat((u.usdt ?? 0).toFixed(2))
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

async function updateRole(userId: number, role: string) {
  error.value = null
  try {
    await $fetch('/api/admin/users/update-role', { method: 'POST', body: { userId, role } })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '권한(역할) 변경에 실패했습니다.'
  }
}

async function modifyBalance(userId: number) {
  error.value = null
  const amount = Number(balanceInputs[userId])
  if (Number.isNaN(amount) || amount < 0) {
    error.value = '올바른 잔고 값을 입력해주세요.'
    return
  }
  try {
    await $fetch('/api/admin/users/update-balance', { method: 'POST', body: { userId, amount } })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '잔고 수정에 실패했습니다.'
  }
}

await load()
</script>
