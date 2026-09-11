<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">입출금 내역</h1>
        <p class="mt-1 text-sm text-slate-400">회원들의 입금/출금 요청을 신청일 최신순으로 확인하고 처리합니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          총 입금액: <span class="font-data-plain text-emerald-300">{{ fmt0(totalDepositKrw) }}원</span>
        </span>
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          총 출금액: <span class="font-data-plain text-rose-300">{{ fmt0(totalWithdrawalKrw) }}원</span>
        </span>
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load()">
          새로고침
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
      <template v-else>
      <div class="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        <input
          v-model.trim="filterUsername"
          placeholder="아이디 검색"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
        <input
          v-model.trim="filterName"
          placeholder="이름 검색"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
        <input
          v-model.trim="filterTopCode"
          placeholder="총판 이름 검색"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">잔고</span>
          <input v-model="filterBalanceMin" type="number" placeholder="최소(원)" class="w-full bg-transparent text-right outline-none placeholder:text-slate-600" />
          <span class="text-slate-600">~</span>
          <input v-model="filterBalanceMax" type="number" placeholder="최대(원)" class="w-full bg-transparent text-right outline-none placeholder:text-slate-600" />
        </div>
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">입금/출금액</span>
          <input v-model="filterAmountMin" type="number" placeholder="최소(원)" class="w-full bg-transparent text-right outline-none placeholder:text-slate-600" />
          <span class="text-slate-600">~</span>
          <input v-model="filterAmountMax" type="number" placeholder="최대(원)" class="w-full bg-transparent text-right outline-none placeholder:text-slate-600" />
        </div>
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">입금 일시</span>
          <input v-model="filterDateFrom" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-600">~</span>
          <input v-model="filterDateTo" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <select v-model="filterType" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">구분: 전체</option>
          <option value="deposit">입금</option>
          <option value="withdrawal">출금</option>
        </select>
        <select v-model="filterStatus" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">처리결과: 전체</option>
          <option value="pending">대기</option>
          <option value="completed">완료</option>
          <option value="rejected">거절</option>
        </select>
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">표시수</span>
          <input
            v-model.number="pageSizeInput"
            type="number"
            min="1"
            max="500"
            class="w-full bg-transparent text-right outline-none"
          />
        </div>
      </div>

      <div class="flex items-center gap-3 text-sm text-slate-300">
        <span>조회: <span class="font-semibold text-white">{{ filteredItems.length }}</span>건</span>
        <span class="text-slate-600">·</span>
        <span>
          입금액: <span class="font-data-plain text-emerald-300">{{ fmt0(filteredDepositKrw) }}원</span>
          / 출금액: <span class="font-data-plain text-rose-300">{{ fmt0(filteredWithdrawalKrw) }}원</span>
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-slate-200">
          <thead class="border-b border-[#12314a] text-[13px] text-slate-400">
            <tr>
              <th v-if="isSuperAdmin" class="w-9 px-3 py-3 text-left">
                <input type="checkbox" class="rounded border-white/20 bg-white/5" :checked="allPagedSelected" @change="toggleSelectAll" />
              </th>
              <th class="sortable-th max-w-[10ch] cursor-pointer select-none truncate px-3 py-3 text-left" @click="toggleSort('username')">회원 아이디<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
              <th class="sortable-th max-w-[10ch] cursor-pointer select-none truncate px-3 py-3 text-left" @click="toggleSort('name')">회원 이름<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
              <th class="sortable-th max-w-[10ch] cursor-pointer select-none truncate px-3 py-3 text-left" @click="toggleSort('topCode')">총판 이름<span class="sort-icon">{{ sortArrow('topCode') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('balanceUsdt')">잔고<span class="sort-icon">{{ sortArrow('balanceUsdt') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('krwAmount')">입금/출금 금액<span class="sort-icon">{{ sortArrow('krwAmount') || ' ⇅' }}</span></th>
              <th class="sortable-th max-w-[5em] cursor-pointer select-none truncate px-3 py-3 text-right" @click="toggleSort('rateUsed')">처리 환율<span class="sort-icon">{{ sortArrow('rateUsed') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('usdtAmount')">USDT 금액<span class="sort-icon">{{ sortArrow('usdtAmount') || ' ⇅' }}</span></th>
              <th class="sortable-th max-w-[5em] cursor-pointer select-none truncate px-3 py-3 text-center" @click="toggleSort('type')">구분<span class="sort-icon">{{ sortArrow('type') || ' ⇅' }}</span></th>
              <th class="sortable-th max-w-[5em] cursor-pointer select-none truncate px-3 py-3 text-center" @click="toggleSort('status')">처리결과<span class="sort-icon">{{ sortArrow('status') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-center" @click="toggleSort('displayDate')">처리 일시<span class="sort-icon">{{ sortArrow('displayDate') || ' ⇅' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredItems.length === 0" class="border-b border-[#0d2438]">
              <td :colspan="isSuperAdmin ? 11 : 10" class="px-3 py-8 text-center text-slate-500">조건에 맞는 입금/출금 요청 내역이 없습니다.</td>
            </tr>
            <tr v-for="it in paged" :key="it.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td v-if="isSuperAdmin" class="px-3 py-3">
                <input type="checkbox" class="rounded border-white/20 bg-white/5" :checked="selectedIds.includes(it.id)" @change="toggleSelectOne(it.id)" />
              </td>
              <td class="max-w-[10ch] truncate px-3 py-3 font-data text-slate-100" :title="it.username">
                <button type="button" class="truncate underline-offset-4 hover:text-cyan-300 hover:underline" @click="memberInfoModal?.open(it.username)">
                  {{ it.username }}
                </button>
              </td>
              <td class="max-w-[10ch] truncate px-3 py-3 text-slate-200" :title="it.name">{{ it.name }}</td>
              <td class="max-w-[10ch] truncate px-3 py-3 font-data text-slate-300" :title="it.topCode">{{ it.topCode || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-data text-slate-200">{{ fmtKrw(it.balanceUsdt) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-data text-slate-100">{{ fmt0(it.krwAmount) }}원</td>
              <td class="max-w-[5em] truncate px-3 py-3 text-right font-data text-slate-300">{{ fmt0(displayRate(it)) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-data text-slate-300">{{ fmt4(displayUsdt(it)) }}</td>
              <td class="max-w-[5em] truncate px-3 py-3 text-center">
                <span
                  class="rounded px-2 py-1 text-[13px] font-semibold ring-1"
                  :class="it.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20' : 'bg-cyan-500/10 text-cyan-200 ring-cyan-400/20'"
                >
                  {{ it.type === 'withdrawal' ? '출금' : '입금' }}
                </span>
              </td>
              <td class="px-3 py-3 text-center">
                <div v-if="it.status === 'pending' && canEdit" class="flex items-center justify-center gap-1.5">
                  <button
                    class="flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-black shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="resolvingId === it.id"
                    @click="resolve(it, 'completed')"
                  >
                    <span class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-black text-[12px] leading-none text-black">✓</span>
                    완료
                  </button>
                  <button
                    class="flex items-center justify-center gap-1 rounded-md bg-[#8f1c1c] px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(143,28,28,0.5)] hover:bg-[#ab2626] disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="resolvingId === it.id"
                    @click="resolve(it, 'rejected')"
                  >
                    <span class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/70 text-[12px] leading-none">✕</span>
                    거절
                  </button>
                </div>
                <span
                  v-else
                  class="rounded px-2 py-1 text-[13px] font-semibold"
                  :class="statusBadgeClass(it.status)"
                >
                  {{ statusLabel(it) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-center font-data text-slate-300">{{ formatDateTime(displayDate(it)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="text-sm text-slate-400">페이지 {{ page }} / {{ totalPages }} · 총 {{ filteredItems.length }}건</div>
        <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
          <button
            v-for="p in pageNumbers"
            :key="`deposits-page-${p}`"
            class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
            :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
            @click="page = p"
          >
            {{ p }}
          </button>
          <span v-if="showPageTail" class="px-1 text-sm text-slate-500">~</span>
          <button
            v-if="showPageTail"
            class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
            @click="page = totalPages"
          >
            {{ totalPages }}
          </button>
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
        </div>
      </div>

      <div v-if="isSuperAdmin" class="flex items-center justify-end gap-2">
        <span v-if="selectedIds.length" class="text-sm text-slate-400">{{ selectedIds.length }}건 선택됨</span>
        <button
          type="button"
          class="rounded-md bg-[#8f1c1c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ab2626] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!selectedIds.length || deleting"
          @click="deleteSelected"
        >
          {{ deleting ? '삭제 중…' : '삭제' }}
        </button>
        <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="openDeletedModal">
          삭제내역
        </button>
      </div>

      </template>
      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <AdminMemberInfoModal ref="memberInfoModal" />

    <div
      v-if="deletedModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="deletedModalOpen = false"
    >
      <div class="w-full max-w-4xl rounded-xl border border-white/10 bg-[#0b1420] p-5 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">삭제내역</h2>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="deletedModalOpen = false">✕</button>
        </div>

        <div v-if="deletedLoading" class="mt-4 text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="!deletedItems.length" class="mt-4 text-sm text-slate-500">삭제된 내역이 없습니다.</div>
        <div v-else class="mt-4 max-h-[60vh] overflow-y-auto">
          <table class="w-full text-sm text-slate-200">
            <thead class="border-b border-[#12314a] text-[13px] text-slate-400">
              <tr>
                <th class="px-3 py-2 text-left">회원 아이디</th>
                <th class="px-3 py-2 text-left">회원 이름</th>
                <th class="px-3 py-2 text-right">입금/출금 금액</th>
                <th class="px-3 py-2 text-center">구분</th>
                <th class="px-3 py-2 text-center">삭제 일시</th>
                <th class="px-3 py-2 text-center">복구</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in deletedItems" :key="it.id" class="border-b border-[#0d2438]">
                <td class="max-w-[10ch] truncate px-3 py-2 font-data text-slate-100" :title="it.username">{{ it.username }}</td>
                <td class="max-w-[10ch] truncate px-3 py-2 text-slate-200" :title="it.name">{{ it.name }}</td>
                <td class="whitespace-nowrap px-3 py-2 text-right font-data text-slate-100">{{ fmt0(it.krwAmount) }}원</td>
                <td class="px-3 py-2 text-center">
                  <span
                    class="rounded px-2 py-1 text-[13px] font-semibold ring-1"
                    :class="it.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20' : 'bg-cyan-500/10 text-cyan-200 ring-cyan-400/20'"
                  >
                    {{ it.type === 'withdrawal' ? '출금' : '입금' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-center font-data text-slate-300">{{ it.deletedAt ? formatDateTime(it.deletedAt) : '—' }}</td>
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-black shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="restoringId === it.id"
                    @click="restoreItem(it)"
                  >
                    {{ restoringId === it.id ? '복구 중…' : '복구' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
  usdtAmount: number | null
  rateUsed: number | null
  status: 'pending' | 'completed' | 'rejected'
  requestedAt: string
  resolvedAt: string | null
  referralCode: string
  topCode: string
  deletedAt?: string | null
}

const { me, refresh } = useMe()
await refresh()

const isSuperAdmin = computed(() => me.value?.role === 'super_admin')

const memberInfoModal = ref<{ open: (username: string) => void } | null>(null)
const items = ref<DepositRow[]>([])
const canEdit = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const resolvingId = ref<number | null>(null)
const krwPerUsdt = ref(0)

// 체크박스 선택(총관리자 전용) — 삭제 버튼으로 일괄 소프트 삭제하기 위함.
const selectedIds = ref<number[]>([])
const allPagedSelected = computed(() => paged.value.length > 0 && paged.value.every((it) => selectedIds.value.includes(it.id)))
function toggleSelectAll() {
  if (allPagedSelected.value) {
    const pagedIds = new Set(paged.value.map((it) => it.id))
    selectedIds.value = selectedIds.value.filter((id) => !pagedIds.has(id))
  } else {
    const next = new Set(selectedIds.value)
    for (const it of paged.value) next.add(it.id)
    selectedIds.value = Array.from(next)
  }
}
function toggleSelectOne(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value = [...selectedIds.value, id]
  else selectedIds.value = selectedIds.value.filter((v) => v !== id)
}

const deleting = ref(false)
async function deleteSelected() {
  if (!selectedIds.value.length || deleting.value) return
  if (!confirm(`선택한 ${selectedIds.value.length}건을 삭제할까요? 삭제내역에서 복구할 수 있습니다.`)) return
  deleting.value = true
  try {
    await $fetch('/api/admin/deposit-requests/delete', { method: 'POST', body: { ids: selectedIds.value } })
    selectedIds.value = []
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || '삭제 중 오류가 발생했습니다.')
  } finally {
    deleting.value = false
  }
}

// 삭제내역(복구) 모달
const deletedModalOpen = ref(false)
const deletedLoading = ref(false)
const deletedItems = ref<DepositRow[]>([])
const restoringId = ref<number | null>(null)
async function openDeletedModal() {
  deletedModalOpen.value = true
  deletedLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/deposit-requests/deleted')
    deletedItems.value = res.items || []
  } catch (e: any) {
    alert(e?.data?.statusMessage || '삭제내역을 불러오지 못했습니다.')
  } finally {
    deletedLoading.value = false
  }
}
async function restoreItem(it: DepositRow) {
  restoringId.value = it.id
  try {
    await $fetch('/api/admin/deposit-requests/restore', { method: 'POST', body: { ids: [it.id] } })
    deletedItems.value = deletedItems.value.filter((row) => row.id !== it.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || '복구 중 오류가 발생했습니다.')
  } finally {
    restoringId.value = null
  }
}

// 컬럼별 필터: 구분/상태는 드롭다운, 아이디/이름은 텍스트 검색,
// 잔고/금액은 원화 기준 최소~최대 범위, 처리 일시는 화면에 보이는 날짜(신청 또는 처리)를 기준으로 범위 검색.
const filterType = ref('')
const filterUsername = ref('')
const filterName = ref('')
const filterTopCode = ref('')
const filterBalanceMin = ref('')
const filterBalanceMax = ref('')
const filterAmountMin = ref('')
const filterAmountMax = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
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

// 신청 직후에는 신청날짜, 관리자가 처리하면 그 순간부터는 처리날짜로 바뀐다("입금 일시" 통합 컬럼).
function displayDate(it: DepositRow) {
  return it.resolvedAt || it.requestedAt
}

type SortKey = 'type' | 'username' | 'name' | 'topCode' | 'balanceUsdt' | 'krwAmount' | 'rateUsed' | 'usdtAmount' | 'displayDate' | 'status'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const filteredItems = computed(() => {
  const uq = filterUsername.value.trim().toLowerCase()
  const nq = filterName.value.trim().toLowerCase()
  const tq = filterTopCode.value.trim().toLowerCase()
  const rows = items.value.filter((it) => {
    if (filterType.value && it.type !== filterType.value) return false
    if (filterStatus.value && it.status !== filterStatus.value) return false
    if (uq && !it.username.toLowerCase().includes(uq)) return false
    if (nq && !it.name.toLowerCase().includes(nq)) return false
    if (tq && !it.topCode.toLowerCase().includes(tq)) return false
    const balanceKrw = Math.round(it.balanceUsdt * krwPerUsdt.value)
    if (!inRange(balanceKrw, filterBalanceMin.value, filterBalanceMax.value)) return false
    if (!inRange(Number(it.krwAmount || 0), filterAmountMin.value, filterAmountMax.value)) return false
    const displayedDate = dateOnly(displayDate(it))
    if (filterDateFrom.value && displayedDate < filterDateFrom.value) return false
    if (filterDateTo.value && displayedDate > filterDateTo.value) return false
    return true
  })

  if (!sortKey.value) return rows
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = key === 'displayDate' ? displayDate(a) : (a as any)[key]
    const bv = key === 'displayDate' ? displayDate(b) : (b as any)[key]
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const page = ref(1)
const pageSizeInput = ref(10)
const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 10)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 10))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})
const pageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showPageTail = computed(() => {
  const nums = pageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})

watch(filteredItems, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 10))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

function fmt4(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function fmt0(v: number) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}
// 모든 금액은 원화로 먼저 보여주고, 테더(USDT) 환산값은 괄호 안에 표기한다.
function fmtKrw(usdtValue: number) {
  return `${Math.round(Number(usdtValue || 0) * krwPerUsdt.value).toLocaleString()}원`
}

// 처리(완료/거절) 시점에 실제 적용된 환율/USDT금액이 저장돼 있으면 그대로 쓰고,
// 아직 대기 중이라 저장된 값이 없으면 현재 환율로 추정해서 보여준다.
function displayRate(it: DepositRow) {
  return it.rateUsed ?? krwPerUsdt.value
}
function displayUsdt(it: DepositRow) {
  if (it.usdtAmount !== null && it.usdtAmount !== undefined) return it.usdtAmount
  const rate = displayRate(it)
  return rate ? Number(it.krwAmount || 0) / rate : 0
}

// 상단 배지: 처리 완료된 건 전체 합계(현재 필터와 무관), 표 위 요약: 지금 필터링된 결과의 합계.
function sumCompletedKrw(rows: DepositRow[], type: 'deposit' | 'withdrawal') {
  return rows.filter((it) => it.type === type && it.status === 'completed').reduce((s, it) => s + Number(it.krwAmount || 0), 0)
}
const totalDepositKrw = computed(() => sumCompletedKrw(items.value, 'deposit'))
const totalWithdrawalKrw = computed(() => sumCompletedKrw(items.value, 'withdrawal'))
const filteredDepositKrw = computed(() => sumCompletedKrw(filteredItems.value, 'deposit'))
const filteredWithdrawalKrw = computed(() => sumCompletedKrw(filteredItems.value, 'withdrawal'))
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
  if (status === 'completed') return 'border border-slate-300 bg-white text-black'
  if (status === 'rejected') return 'bg-[#8f1c1c] text-white'
  return 'ring-1 bg-amber-500/15 text-amber-200 ring-amber-400/20'
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

.sortable-th {
  color: rgb(203 213 225 / 0.9);
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: #fff;
}
.sortable-th .sort-icon {
  margin-left: 2px;
  font-size: 12px;
  color: rgb(148 163 184 / 0.6);
}
.sortable-th:hover .sort-icon {
  color: rgb(203 213 225 / 0.9);
}
</style>
