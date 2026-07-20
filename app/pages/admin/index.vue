<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">관리자 대시보드</h1>
      <p class="mt-2 text-sm text-slate-400">
        유저 목록 확인, 가상 USDT 입금, (추후) 지사 계정 생성/권한 제어를 여기서 확장합니다.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink
          v-if="me?.role === 'super_admin'"
          to="/admin/create-branch"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          계정생성
        </NuxtLink>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="text-sm text-slate-400">현재 로그인</div>
      <div class="mt-1 font-medium">{{ me?.username }} ({{ me?.role }})</div>
    </div>

    <!-- 유저/권한 관리 + 잔고 수정: 대시보드에 바로 표시 -->
    <div class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">유저 및 권한 관리</h2>
          <p class="mt-1 text-sm text-slate-400">사용자 역할 설정 및 가상 USDT 잔고를 직접 변경할 수 있습니다.</p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="load">
          새로고침
        </button>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">ID</th>
                <th class="py-2">아이디</th>
                <th class="py-2">USDT</th>
                <th class="py-2">역할(권한 변경)</th>
                <th class="py-2">USDT 잔액 수정</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" class="border-t border-white/10">
                <td class="py-2 font-mono">{{ u.id }}</td>
                <td class="py-2">{{ u.username }}</td>
                <td class="py-2 font-mono">{{ (u.usdt ?? 0).toFixed(2) }}</td>
                <td class="py-2">
                  <select
                    v-model="roleDraft[u.id]"
                    class="w-48 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    :disabled="!canEditRole"
                    @change="updateRole(u.id)"
                  >
                    <option value="user">일반 유저 (user)</option>
                    <option value="branch_admin">부어드민 (branch_admin)</option>
                    <option value="super_admin">최고관리자 (super_admin)</option>
                  </select>
                </td>
                <td class="py-2">
                  <div class="flex items-center gap-2">
                    <input
                      v-model.number="balanceDraft[u.id]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                      placeholder="예: 1000"
                      :disabled="!canEditBalance"
                    />
                    <button
                      class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!canEditBalance"
                      @click="updateBalance(u.id)"
                    >
                      수정
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
        <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      </div>
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
const msg = ref<string | null>(null)
const balanceDraft = reactive<Record<number, number>>({})
const roleDraft = reactive<Record<number, string>>({})

const canEditRole = computed(() => me.value?.role === 'super_admin')
const canEditBalance = computed(() => me.value?.role === 'super_admin' || me.value?.permissions?.canCredit)

async function load() {
  loading.value = true
  error.value = null
  msg.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    for (const u of users.value) {
      if (balanceDraft[u.id] === undefined) balanceDraft[u.id] = Number(u.usdt ?? 0)
      roleDraft[u.id] = String(u.role || 'user')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

async function updateBalance(userId: number) {
  const usdt = Number(balanceDraft[userId])
  if (!Number.isFinite(usdt) || usdt < 0) return
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, usdt } })
    await load()
    msg.value = '잔고가 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '잔고 수정 실패'
  }
}

async function updateRole(userId: number) {
  const role = String(roleDraft[userId] || 'user')
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, role } })
    await load()
    msg.value = '역할이 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '역할 수정 실패'
  }
}

await load()
</script>
