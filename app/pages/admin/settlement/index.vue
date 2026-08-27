<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">정산내역</h1>
        <p class="mt-1 text-sm text-slate-400">선택한 기간의 회원별 정산금을 확인합니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load()">
          새로고침
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="flex flex-wrap items-center gap-3">
        <div v-if="allowedTypes.length > 1" class="flex items-center gap-1 rounded-md border border-[#173753] bg-[#041425] p-1">
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm"
            :class="type === 'loss' ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-300 hover:bg-white/5'"
            @click="type = 'loss'"
          >
            손실정산
          </button>
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm"
            :class="type === 'referral' ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-300 hover:bg-white/5'"
            @click="type = 'referral'"
          >
            레퍼럴정산
          </button>
        </div>

        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input bg-transparent outline-none" />
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="load()">조회</button>
        <button class="rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10" @click="resetToThisWeek">이번주</button>

        <div class="ml-auto rounded-md border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
          기간 총 정산금 <span class="font-mono text-base font-semibold">{{ fmt2(total) }}</span> USDT
          <span class="ml-2 text-xs text-cyan-300/70">(정산비율 {{ percent }}%)</span>
        </div>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">회원 아이디</th>
              <th class="px-3 py-3 text-left">이름</th>
              <th class="px-3 py-3 text-right">잔액</th>
              <th class="px-3 py-3 text-center">입금</th>
              <th class="px-3 py-3 text-right">정산금</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && items.length === 0" class="border-b border-[#0d2438]">
              <td colspan="5" class="px-3 py-8 text-center text-slate-500">데이터가 없습니다.</td>
            </tr>
            <tr v-for="it in items" :key="it.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 font-mono text-slate-100">{{ it.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ it.name }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(it.balanceUsdt) }}</td>
              <td class="px-3 py-3 text-center">
                <template v-if="!it.deposit">
                  <span class="text-slate-500">-</span>
                </template>
                <template v-else-if="it.deposit.status === 'pending'">
                  <div v-if="canEditDeposit" class="flex items-center justify-center gap-1">
                    <button
                      class="rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/20 hover:bg-emerald-500/25 disabled:opacity-40"
                      :disabled="resolvingId === it.deposit.id"
                      @click="resolve(it, 'completed')"
                    >
                      완료
                    </button>
                    <button
                      class="rounded bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/25 disabled:opacity-40"
                      :disabled="resolvingId === it.deposit.id"
                      @click="resolve(it, 'rejected')"
                    >
                      거절
                    </button>
                  </div>
                  <span v-else class="rounded bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/20">
                    입금요청 ({{ fmt0(it.deposit.krwAmount) }}원)
                  </span>
                </template>
                <template v-else>
                  <span
                    class="rounded px-2 py-1 text-[11px] font-semibold ring-1"
                    :class="it.deposit.status === 'completed' ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20' : 'bg-rose-500/10 text-rose-300 ring-rose-400/20'"
                  >
                    {{ it.deposit.status === 'completed' ? '완료' : '거절' }}
                  </span>
                </template>
              </td>
              <td class="px-3 py-3 text-right font-mono text-slate-100">{{ fmt2(it.settlementAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type SettlementItem = {
  id: number
  username: string
  name: string
  balanceUsdt: number
  settlementAmount: number
  deposit: { id: number; krwAmount: number; status: 'pending' | 'completed' | 'rejected' } | null
}

const { me, refresh } = useMe()
await refresh()

function settlementTypesOf() {
  if (me.value?.role === 'super_admin') return ['loss', 'referral'] as const
  const raw = (me.value as any)?.permissions?.settlementTypes
  if (!Array.isArray(raw) || raw.length === 0) return ['loss', 'referral'] as const
  return raw as ('loss' | 'referral')[]
}

const allowedTypes = ref(settlementTypesOf())
const type = ref<'loss' | 'referral'>(allowedTypes.value[0] || 'loss')

function thisWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

const initRange = thisWeekRange()
const fromDate = ref(initRange.from)
const toDate = ref(initRange.to)

const items = ref<SettlementItem[]>([])
const total = ref(0)
const percent = ref(0)
const canEditDeposit = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const resolvingId = ref<number | null>(null)

function fmt2(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmt0(v: number) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function resetToThisWeek() {
  const r = thisWeekRange()
  fromDate.value = r.from
  toDate.value = r.to
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/admin/settlement', {
      query: { type: type.value, from: fromDate.value, to: toDate.value }
    })
    items.value = res.items || []
    total.value = Number(res.total || 0)
    percent.value = Number(res.percent || 0)
    canEditDeposit.value = Boolean(res.canEditDeposit)
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '정산내역을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function resolve(it: SettlementItem, status: 'completed' | 'rejected') {
  if (!it.deposit) return
  resolvingId.value = it.deposit.id
  try {
    await $fetch('/api/admin/deposit-requests/resolve', {
      method: 'POST',
      body: { requestId: it.deposit.id, status }
    })
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || '처리 중 오류가 발생했습니다.')
  } finally {
    resolvingId.value = null
  }
}

watch(type, () => load())

onMounted(() => {
  load().catch(() => {})
})
</script>

<style scoped>
.date-input {
  position: relative;
  min-width: 140px;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}
</style>
