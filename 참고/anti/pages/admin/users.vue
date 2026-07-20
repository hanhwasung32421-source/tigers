<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">유저/입금 관리</h1>
        <p class="mt-1 text-sm text-slate-400">가상 USDT 입금(잔고 증가)만 제공합니다.</p>
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
              <th class="py-2">역할</th>
              <th class="py-2">USDT</th>
              <th class="py-2">입금</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-t border-white/10">
              <td class="py-2 font-mono">{{ u.id }}</td>
              <td class="py-2">{{ u.username }}</td>
              <td class="py-2">{{ u.role }}</td>
              <td class="py-2 font-mono">{{ (u.usdt ?? 0).toFixed(2) }}</td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="creditAmount[u.id]"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    placeholder="예: 100"
                  />
                  <button class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400" @click="credit(u.id)">
                    입금
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type AdminUserRow = { id: number; username: string; role: string; usdt: number; created_at: string }

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const creditAmount = reactive<Record<number, number>>({})

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

async function credit(userId: number) {
  const amount = Number(creditAmount[userId] || 0)
  if (!amount || amount <= 0) return
  try {
    await $fetch('/api/admin/users/credit', { method: 'POST', body: { userId, amount } })
    await load()
    creditAmount[userId] = 0
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '입금 실패'
  }
}

await load()
</script>

