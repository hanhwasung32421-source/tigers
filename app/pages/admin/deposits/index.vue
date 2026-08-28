<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">입금/출금 내역</h1>
        <p class="mt-1 text-sm text-slate-400">회원들의 입금/출금 요청을 신청일 최신순으로 확인하고 처리합니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load()">
          새로고침
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
      <div v-else class="overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-center">구분</th>
              <th class="px-3 py-3 text-left">회원 아이디</th>
              <th class="px-3 py-3 text-left">이름</th>
              <th class="px-3 py-3 text-right">잔액</th>
              <th class="px-3 py-3 text-right">금액</th>
              <th class="px-3 py-3 text-left">신청날짜</th>
              <th class="px-3 py-3 text-left">처리날짜</th>
              <th class="px-3 py-3 text-center">상태</th>
            </tr>
            <tr class="border-b border-[#12314a] bg-white/[0.02]">
              <th class="px-3 py-2">
                <select v-model="filterType" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none">
                  <option value="">전체</option>
                  <option value="deposit">입금</option>
                  <option value="withdrawal">출금</option>
                </select>
              </th>
              <th class="px-3 py-2">
                <input v-model.trim="filterUsername" placeholder="아이디 검색" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-600" />
              </th>
              <th class="px-3 py-2">
                <input v-model.trim="filterName" placeholder="이름 검색" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-600" />
              </th>
              <th class="px-3 py-2">
                <div class="flex items-center gap-1">
                  <input v-model="filterBalanceMin" type="number" placeholder="최소(원)" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-right text-xs text-slate-200 outline-none placeholder:text-slate-600" />
                  <span class="text-slate-600">~</span>
                  <input v-model="filterBalanceMax" type="number" placeholder="최대(원)" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-right text-xs text-slate-200 outline-none placeholder:text-slate-600" />
                </div>
              </th>
              <th class="px-3 py-2">
                <div class="flex items-center gap-1">
                  <input v-model="filterAmountMin" type="number" placeholder="최소(원)" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-right text-xs text-slate-200 outline-none placeholder:text-slate-600" />
                  <span class="text-slate-600">~</span>
                  <input v-model="filterAmountMax" type="number" placeholder="최대(원)" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-right text-xs text-slate-200 outline-none placeholder:text-slate-600" />
                </div>
              </th>
              <th class="px-3 py-2">
                <div class="flex items-center gap-1">
                  <input v-model="filterRequestedFrom" type="date" class="date-input w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none" />
                  <span class="text-slate-600">~</span>
                  <input v-model="filterRequestedTo" type="date" class="date-input w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none" />
                </div>
              </th>
              <th class="px-3 py-2">
                <div class="flex items-center gap-1">
                  <input v-model="filterResolvedFrom" type="date" class="date-input w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none" />
                  <span class="text-slate-600">~</span>
                  <input v-model="filterResolvedTo" type="date" class="date-input w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none" />
                </div>
              </th>
              <th class="px-3 py-2">
                <select v-model="filterStatus" class="w-full rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-xs text-slate-200 outline-none">
                  <option value="">전체</option>
                  <option value="pending">대기</option>
                  <option value="completed">완료</option>
                  <option value="rejected">거절</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredItems.length === 0" class="border-b border-[#0d2438]">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500">조건에 맞는 입금/출금 요청 내역이 없습니다.</td>
            </tr>
            <tr v-for="it in filteredItems" :key="it.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 text-center">
                <span
                  class="rounded px-2 py-1 text-[11px] font-semibold ring-1"
                  :class="it.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20' : 'bg-cyan-500/10 text-cyan-200 ring-cyan-400/20'"
                >
                  {{ it.type === 'withdrawal' ? '출금' : '입금' }}
                </span>
              </td>
              <td class="px-3 py-3 font-mono text-slate-100">{{ it.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ it.name }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-200">
                <div>{{ fmtKrw(it.balanceUsdt) }}</div>
                <div class="text-slate-500">({{ fmt2(it.balanceUsdt) }} 테더)</div>
              </td>
              <td class="px-3 py-3 text-right font-mono text-slate-100">
                <div>{{ fmt0(it.krwAmount) }}원</div>
                <div class="text-slate-500">({{ fmtUsdtFromKrw(it.krwAmount) }} 테더)</div>
              </td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ formatDateTime(it.requestedAt) }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ it.resolvedAt ? formatDateTime(it.resolvedAt) : '-' }}</td>
              <td class="px-3 py-3 text-center">
                <div v-if="it.status === 'pending' && canEdit" class="flex items-center justify-center gap-1">
                  <button
                    class="rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/20 hover:bg-emerald-500/25 disabled:opacity-40"
                    :disabled="resolvingId === it.id"
                    @click="resolve(it, 'completed')"
                  >
                    완료
                  </button>
                  <button
                    class="rounded bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/25 disabled:opacity-40"
                    :disabled="resolvingId === it.id"
                    @click="resolve(it, 'rejected')"
                  >
                    거절
                  </button>
                </div>
                <span
                  v-else
                  class="rounded px-2 py-1 text-[11px] font-semibold ring-1"
                  :class="statusBadgeClass(it.status)"
                >
                  {{ statusLabel(it) }}
                </span>
              </td>
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

type DepositRow = {
  id: number
  type: 'deposit' | 'withdrawal'
  username: string
  name: string
  balanceUsdt: number
  krwAmount: number
  status: 'pending' | 'completed' | 'rejected'
  requestedAt: string
  resolvedAt: string | null
}

const { refresh } = useMe()
await refresh()

const items = ref<DepositRow[]>([])
const canEdit = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const resolvingId = ref<number | null>(null)
const krwPerUsdt = ref(0)

// 컬럼별 필터: 구분/상태는 드롭다운, 아이디/이름은 텍스트 검색,
// 잔액/금액은 원화 기준 최소~최대 범위, 날짜는 기간 범위.
const filterType = ref('')
const filterUsername = ref('')
const filterName = ref('')
const filterBalanceMin = ref('')
const filterBalanceMax = ref('')
const filterAmountMin = ref('')
const filterAmountMax = ref('')
const filterRequestedFrom = ref('')
const filterRequestedTo = ref('')
const filterResolvedFrom = ref('')
const filterResolvedTo = ref('')
const filterStatus = ref('')

function inRange(value: number, min: unknown, max: unknown) {
  // type="number" 입력은 값이 채워지면 Vue가 문자열이 아니라 숫자로 바꿔주므로 항상 문자열로 방어적 변환.
  const minRaw = String(min ?? '').trim()
  const maxRaw = String(max ?? '').trim()
  const minN = minRaw === '' ? null : Number(minRaw)
  const maxN = maxRaw === '' ? null : Number(maxRaw)
  if (minN !== null && Number.isFinite(minN) && value < minN) return false
  if (maxN !== null && Number.isFinite(maxN) && value > maxN) return false
  return true
}
function dateOnly(v: string | null) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}

const filteredItems = computed(() => {
  const uq = filterUsername.value.trim().toLowerCase()
  const nq = filterName.value.trim().toLowerCase()
  return items.value.filter((it) => {
    if (filterType.value && it.type !== filterType.value) return false
    if (filterStatus.value && it.status !== filterStatus.value) return false
    if (uq && !it.username.toLowerCase().includes(uq)) return false
    if (nq && !it.name.toLowerCase().includes(nq)) return false
    const balanceKrw = Math.round(it.balanceUsdt * krwPerUsdt.value)
    if (!inRange(balanceKrw, filterBalanceMin.value, filterBalanceMax.value)) return false
    if (!inRange(Number(it.krwAmount || 0), filterAmountMin.value, filterAmountMax.value)) return false
    const requestedDate = dateOnly(it.requestedAt)
    if (filterRequestedFrom.value && requestedDate < filterRequestedFrom.value) return false
    if (filterRequestedTo.value && requestedDate > filterRequestedTo.value) return false
    if (filterResolvedFrom.value || filterResolvedTo.value) {
      const resolvedDate = dateOnly(it.resolvedAt)
      if (!resolvedDate) return false
      if (filterResolvedFrom.value && resolvedDate < filterResolvedFrom.value) return false
      if (filterResolvedTo.value && resolvedDate > filterResolvedTo.value) return false
    }
    return true
  })
})

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmt0(v: number) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}
// 모든 금액은 원화로 먼저 보여주고, 테더(USDT) 환산값은 괄호 안에 표기한다.
function fmtKrw(usdtValue: number) {
  return `${Math.round(Number(usdtValue || 0) * krwPerUsdt.value).toLocaleString()}원`
}
function fmtUsdtFromKrw(krwValue: number) {
  if (!krwPerUsdt.value) return '0.00'
  return fmt2(Number(krwValue || 0) / krwPerUsdt.value)
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
    hour12: false
  }).format(d)
}
function statusLabel(it: DepositRow) {
  if (it.status === 'completed') return '완료'
  if (it.status === 'rejected') return '거절'
  return it.type === 'withdrawal' ? '출금요청' : '입금요청'
}
function statusBadgeClass(status: DepositRow['status']) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20'
  if (status === 'rejected') return 'bg-rose-500/10 text-rose-300 ring-rose-400/20'
  return 'bg-amber-500/15 text-amber-200 ring-amber-400/20'
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/admin/deposits')
    items.value = res.items || []
    canEdit.value = Boolean(res.canEdit)
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '입금/출금 내역을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function resolve(it: DepositRow, status: 'completed' | 'rejected') {
  resolvingId.value = it.id
  try {
    await $fetch('/api/admin/deposit-requests/resolve', {
      method: 'POST',
      body: { requestId: it.id, status }
    })
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || '처리 중 오류가 발생했습니다.')
  } finally {
    resolvingId.value = null
  }
}

async function loadKrwRate() {
  try {
    const res = await $fetch<{ rate: number }>('/api/settings/krw-rate')
    krwPerUsdt.value = Number(res.rate || 0)
  } catch {
    // 환율 조회 실패해도 목록 자체는 계속 보여준다(괄호 안 테더 환산값만 0으로 표시됨).
  }
}

onMounted(() => {
  load().catch(() => {})
  loadKrwRate().catch(() => {})
})
</script>

<style scoped>
.date-input {
  color-scheme: dark;
}
</style>
