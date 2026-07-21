<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-xl font-semibold">회원 목록</h1>
      <p class="mt-1 text-sm text-slate-400">회원 목록을 조회합니다.</p>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="grid gap-2 md:grid-cols-[220px_160px_minmax(240px,1fr)_120px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="w-full bg-transparent outline-none" />
        </div>
        <select v-model="roleFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유저권한</option>
          <option value="회원">회원</option>
          <option value="총판">총판</option>
          <option value="관리자">관리자</option>
        </select>
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <select v-model="onlineFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">접속여부</option>
          <option value="접속">접속</option>
          <option value="미접속">미접속</option>
        </select>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">유저권한</th>
              <th class="px-3 py-3 text-left">승인상태</th>
              <th class="px-3 py-3 text-left">아이디</th>
              <th class="px-3 py-3 text-left">회원이름</th>
              <th class="px-3 py-3 text-left">총판이름</th>
              <th class="px-3 py-3 text-left">총판부모</th>
              <th class="px-3 py-3 text-right">총판수율</th>
              <th class="px-3 py-3 text-right">보유금액</th>
              <th class="px-3 py-3 text-right">누적 손실</th>
              <th class="px-3 py-3 text-left">가입일</th>
              <th class="px-3 py-3 text-left">접속여부</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="11" class="px-3 py-8 text-center text-slate-500">데이터가 없습니다.</td>
            </tr>
            <tr v-for="u in paged" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3">
                <span class="rounded bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">{{ u.role }}</span>
              </td>
              <td class="px-3 py-3">
                <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">승인</span>
              </td>
              <td class="px-3 py-3 font-mono text-slate-100">{{ u.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ u.name }}</td>
              <td class="px-3 py-3 text-slate-300">{{ u.affiliateName }}</td>
              <td class="px-3 py-3 text-slate-500">{{ u.affiliateParent }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmtRate(u.affiliateRate) }}</td>
              <td class="px-3 py-3 text-right font-mono">
                <button
                  type="button"
                  class="rounded bg-cyan-500/10 px-2 py-1 text-cyan-100 ring-1 ring-cyan-400/20 hover:bg-cyan-500/15"
                  @click="openTradeModal(u)"
                >
                  {{ fmt2(u.balanceUsdt) }}
                </button>
              </td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmt2(u.cumulativeLoss) }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ dateOnly(u.created_at) }}</td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                  :class="u.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                >
                  {{ u.online ? '접속' : '미접속' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <span class="min-w-9 rounded bg-white/10 px-3 py-1.5 text-center text-sm">{{ page }}</span>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <Transition name="member-modal">
      <div v-if="tradeModalOpen && selectedMember" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" @click.self="closeTradeModal">
        <div class="w-full max-w-6xl rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ selectedMember.name }} 거래내역</h2>
              <p class="mt-1 text-sm text-slate-400">
                아이디 `{{ selectedMember.username }}` · 현재 보유금액 {{ fmt2(selectedMember.balanceUsdt) }} USDT
              </p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeTradeModal">닫기</button>
          </div>

          <div class="mt-4 overflow-auto">
            <table class="min-w-full text-xs text-slate-200">
              <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
                <tr>
                  <th class="px-3 py-3 text-left">날짜</th>
                  <th class="px-3 py-3 text-left">심볼</th>
                  <th class="px-3 py-3 text-left">주문유형</th>
                  <th class="px-3 py-3 text-right">레버리지</th>
                  <th class="px-3 py-3 text-right">체결가격</th>
                  <th class="px-3 py-3 text-right">체결량</th>
                  <th class="px-3 py-3 text-right">실현손익</th>
                  <th class="px-3 py-3 text-right">수수료</th>
                  <th class="px-3 py-3 text-left">접속상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!tradeLoading && memberTrades.length === 0" class="border-b border-[#0d2438]">
                  <td colspan="9" class="px-3 py-8 text-center text-slate-500">거래 내역이 없습니다.</td>
                </tr>
                <tr v-for="t in memberTrades" :key="t.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
                  <td class="px-3 py-3 font-mono text-slate-300">{{ formatDateTime(t.created_at) }}</td>
                  <td class="px-3 py-3 font-semibold text-slate-100">{{ t.symbol }}</td>
                  <td class="px-3 py-3 text-slate-200">{{ t.orderType }}</td>
                  <td class="px-3 py-3 text-right font-mono text-slate-300">x{{ t.leverage }}</td>
                  <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmtPrice(t.price) }}</td>
                  <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(t.qty) }}</td>
                  <td class="px-3 py-3 text-right font-mono" :class="t.pnl >= 0 ? 'text-emerald-400' : 'text-blue-400'">
                    {{ t.pnl >= 0 ? '+' : '' }}{{ fmt2(t.pnl) }}
                  </td>
                  <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmt2(t.fee) }}</td>
                  <td class="px-3 py-3">
                    <span
                      class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                      :class="t.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                    >
                      {{ t.online ? '실시간 접속중' : '미접속중' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="tradeError" class="mt-3 text-sm text-rose-300">{{ tradeError }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type MemberRow = {
  id: number
  role: string
  approved: boolean
  username: string
  name: string
  affiliateName: string
  affiliateParent: string
  affiliateRate: number
  balanceUsdt: number
  cumulativeLoss: number
  created_at: string
  online: boolean
  last_ip: string | null
}

type MemberTradeRow = {
  id: number
  created_at: string
  symbol: string
  orderType: string
  leverage: number
  price: number
  qty: number
  pnl: number
  fee: number
  online: boolean
}

const { refresh } = useMe()
await refresh()

const items = ref<MemberRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const onlineFilter = ref('')
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const pageSize = 10
const tradeModalOpen = ref(false)
const selectedMember = ref<MemberRow | null>(null)
const memberTrades = ref<MemberTradeRow[]>([])
const tradeLoading = ref(false)
const tradeError = ref<string | null>(null)
let pollTimer: any = null
let loadingNow = false

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function fmt2(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtRate(v: number) {
  return `${Number(v || 0).toFixed(2)}`
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((u) => {
    if (roleFilter.value && u.role !== roleFilter.value) return false
    if (onlineFilter.value) {
      const want = onlineFilter.value === '접속'
      if (u.online !== want) return false
    }
    if (fromDate.value) {
      const d = dateOnly(u.created_at)
      if (d < fromDate.value) return false
    }
    if (toDate.value) {
      const d = dateOnly(u.created_at)
      if (d > toDate.value) return false
    }
    if (!q) return true
    return [u.username, u.name, u.affiliateName, String(u.id)].some((v) => String(v).toLowerCase().includes(q))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ items: MemberRow[] }>('/api/admin/members')
    items.value = res.items || []
    if (selectedMember.value) {
      const fresh = (res.items || []).find((u) => Number(u.id) === Number(selectedMember.value?.id))
      if (fresh) selectedMember.value = fresh
    }
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '회원 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
    loadingNow = false
  }
}

async function loadMemberTrades(silent = false) {
  if (!selectedMember.value) return
  if (!silent) tradeLoading.value = true
  try {
    const res = await $fetch<{ items: MemberTradeRow[] }>('/api/admin/trades', {
      query: { limit: 200, offset: 0, userId: selectedMember.value.id }
    })
    memberTrades.value = res.items || []
    tradeError.value = null
  } catch (e: any) {
    tradeError.value = e?.data?.statusMessage || '거래 내역을 불러오지 못했습니다.'
  } finally {
    tradeLoading.value = false
  }
}

async function openTradeModal(member: MemberRow) {
  selectedMember.value = member
  tradeModalOpen.value = true
  await loadMemberTrades()
}

function closeTradeModal() {
  tradeModalOpen.value = false
  selectedMember.value = null
  memberTrades.value = []
  tradeError.value = null
}

onMounted(async () => {
  await load()
  pollTimer = setInterval(() => {
    load(true).catch(() => {})
    if (tradeModalOpen.value && selectedMember.value) {
      loadMemberTrades(true).catch(() => {})
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
})
</script>

<style scoped>
.member-modal-enter-active,
.member-modal-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.member-modal-enter-from,
.member-modal-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
