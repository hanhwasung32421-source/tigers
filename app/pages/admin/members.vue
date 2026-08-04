<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-xl font-semibold">회원 목록</h1>
      <p class="mt-1 text-sm text-slate-400">회원 목록을 조회합니다.</p>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="grid gap-2 md:grid-cols-[360px_160px_minmax(220px,1fr)_120px_160px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
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
              <th class="px-3 py-3 text-right">누적수익</th>
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
              <td class="px-3 py-3 font-mono text-slate-100">
                <button type="button" class="underline-offset-4 hover:text-cyan-300 hover:underline" @click="openProfileModal(u)">
                  {{ u.username }}
                </button>
              </td>
              <td class="px-3 py-3 text-slate-200">{{ u.name }}</td>
              <td class="px-3 py-3 text-slate-300">{{ u.affiliateName }}</td>
              <td class="px-3 py-3 text-slate-500">{{ u.affiliateParent }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmtRate(u.affiliateRate) }}</td>
              <td class="px-3 py-3 text-right font-mono">
                <button
                  type="button"
                  class="rounded bg-cyan-500/10 px-2 py-1 text-cyan-100 ring-1 ring-cyan-400/20 hover:bg-cyan-500/15"
                  @click="openBalanceModal(u)"
                >
                  {{ fmt2(u.balanceUsdt) }}
                </button>
              </td>
              <td class="px-3 py-3 text-right font-mono">
                <button
                  type="button"
                  class="rounded px-2 py-1 ring-1"
                  :class="
                    u.cumulativeProfit >= 0
                      ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20 hover:bg-rose-500/15'
                      : 'bg-sky-500/10 text-sky-300 ring-sky-400/20 hover:bg-sky-500/15'
                  "
                  @click="openTradeModal(u)"
                >
                  {{ signedProfitText(u.cumulativeProfit) }}
                </button>
              </td>
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

      <div class="mt-4 flex items-center justify-between gap-3">
        <div class="text-sm text-slate-400">페이지 {{ page }} / {{ totalPages }} · 총 {{ filtered.length }}명</div>
        <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`member-page-${p}`"
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

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <Transition name="member-modal">
      <div v-if="profileModalOpen && selectedMember" class="fixed inset-0 z-[82] flex items-center justify-center bg-black/60 px-4" @click.self="closeProfileModal">
        <div class="w-full max-w-2xl rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">회원정보 수정</h2>
              <p class="mt-1 text-sm text-slate-400">아이디 `{{ selectedMember.username }}`</p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeProfileModal">닫기</button>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-sm text-slate-300">이름</label>
              <input v-model.trim="profileDraft.name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">생년월일</label>
              <input v-model.trim="profileDraft.birthDate" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">은행명</label>
              <select v-model="profileDraft.bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-cyan-500">
                <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-slate-300">은행계좌</label>
              <input v-model.trim="profileDraft.bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">예금주</label>
              <input v-model.trim="profileDraft.accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">추천코드</label>
              <input :value="selectedMember.referralCode" disabled class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-500 outline-none ring-1 ring-white/10" />
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              :disabled="profileSaving"
              @click="saveProfile"
            >
              {{ profileSaving ? '저장 중...' : '저장' }}
            </button>
          </div>
          <p v-if="profileError" class="mt-3 text-sm text-rose-300">{{ profileError }}</p>
        </div>
      </div>
    </Transition>

    <Transition name="member-modal">
      <div v-if="tradeModalOpen && selectedMember" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" @click.self="closeTradeModal">
        <div class="flex max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ selectedMember.name }} 거래내역</h2>
              <p class="mt-1 text-sm text-slate-400">
                아이디 `{{ selectedMember.username }}` · 현재 보유금액 {{ fmt2(selectedMember.balanceUsdt) }} USDT
              </p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeTradeModal">닫기</button>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-auto">
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
                <tr v-if="!tradeLoading && pagedMemberTrades.length === 0" class="border-b border-[#0d2438]">
                  <td colspan="9" class="px-3 py-8 text-center text-slate-500">거래 내역이 없습니다.</td>
                </tr>
                <tr v-for="t in pagedMemberTrades" :key="t.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
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
          <div class="mt-4 flex items-center justify-center gap-2" v-if="memberTradeTotalPages > 1">
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage = 1"
            >
              «
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage--"
            >
              ‹
            </button>
            <button
              v-for="p in memberTradePageNumbers"
              :key="`member-trade-page-${p}`"
              class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
              :class="p === memberTradePage ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="memberTradePage = p"
            >
              {{ p }}
            </button>
            <span v-if="showMemberTradeTail" class="px-1 text-sm text-slate-500">~</span>
            <button
              v-if="showMemberTradeTail"
              class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
              @click="memberTradePage = memberTradeTotalPages"
            >
              {{ memberTradeTotalPages }}
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage++"
            >
              ›
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage = memberTradeTotalPages"
            >
              »
            </button>
          </div>
          <p v-if="tradeError" class="mt-3 text-sm text-rose-300">{{ tradeError }}</p>
        </div>
      </div>
    </Transition>

    <Transition name="member-modal">
      <div v-if="balanceModalOpen && selectedMember" class="fixed inset-0 z-[81] flex items-center justify-center bg-black/60 px-4" @click.self="closeBalanceModal">
        <div class="w-full max-w-md rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ selectedMember.name }} 보유금액 수정</h2>
              <p class="mt-1 text-sm text-slate-400">현재 보유 현금 USDT를 직접 수정합니다.</p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">닫기</button>
          </div>

          <div class="mt-4">
            <label class="text-sm text-slate-300">보유금액 (USDT)</label>
            <input
              v-model.number="balanceDraft"
              type="number"
              min="0"
              step="0.01"
              class="mt-2 w-full rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-100 outline-none"
              :disabled="!canEditBalance || balanceSaving"
            />
          </div>

          <p v-if="balanceError" class="mt-3 text-sm text-rose-300">{{ balanceError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-md bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">
              취소
            </button>
            <button
              type="button"
              class="rounded-md bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40"
              :disabled="!canEditBalance || balanceSaving"
              @click="saveBalance"
            >
              수정
            </button>
          </div>
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
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
  affiliateName: string
  affiliateParent: string
  affiliateRate: number
  balanceUsdt: number
  cumulativeProfit: number
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

const { me, refresh } = useMe()
await refresh()

const items = ref<MemberRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const onlineFilter = ref('')
const DEFAULT_FROM_DATE = '2026-01-01'
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10)
const fromDate = ref(DEFAULT_FROM_DATE)
const toDate = ref(DEFAULT_TO_DATE)
const page = ref(1)
const pageSizeInput = ref(20)
const tradeModalOpen = ref(false)
const balanceModalOpen = ref(false)
const profileModalOpen = ref(false)
const selectedMember = ref<MemberRow | null>(null)
const memberTrades = ref<MemberTradeRow[]>([])
const tradeLoading = ref(false)
const tradeError = ref<string | null>(null)
const memberTradePage = ref(1)
const memberTradePageSize = 10
const balanceDraft = ref(0)
const balanceSaving = ref(false)
const balanceError = ref<string | null>(null)
const profileSaving = ref(false)
const profileError = ref<string | null>(null)
const profileDraft = reactive({
  name: '',
  birthDate: '',
  bankName: '국민은행',
  bankAccount: '',
  accountHolder: ''
})
const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]
let pollTimer: any = null
let loadingNow = false
const canEditBalance = computed(() => me.value?.role === 'super_admin' || (me.value as any)?.permissions?.canCredit)
const autoRefreshPaused = computed(() => tradeModalOpen.value || balanceModalOpen.value || profileModalOpen.value)
const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 20)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 20))
})

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function fmt2(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function signedProfitText(v: number) {
  const n = Number(v || 0)
  return `${n >= 0 ? '+' : '-'}${fmt2(Math.abs(n))}`
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

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
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
const memberTradeTotalPages = computed(() => Math.max(1, Math.ceil(memberTrades.value.length / memberTradePageSize)))
const pagedMemberTrades = computed(() => {
  const start = (memberTradePage.value - 1) * memberTradePageSize
  return memberTrades.value.slice(start, start + memberTradePageSize)
})
const memberTradePageNumbers = computed(() => {
  const total = memberTradeTotalPages.value
  const start = Math.floor((memberTradePage.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showMemberTradeTail = computed(() => {
  const nums = memberTradePageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < memberTradeTotalPages.value
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 20))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(memberTrades, () => {
  if (memberTradePage.value > memberTradeTotalPages.value) memberTradePage.value = memberTradeTotalPages.value
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
    memberTradePage.value = 1
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
  memberTradePage.value = 1
  await loadMemberTrades()
}

function closeTradeModal() {
  tradeModalOpen.value = false
  memberTrades.value = []
  memberTradePage.value = 1
  tradeError.value = null
  if (!balanceModalOpen.value) selectedMember.value = null
}

function openBalanceModal(member: MemberRow) {
  selectedMember.value = member
  balanceDraft.value = Number(member.balanceUsdt || 0)
  balanceError.value = null
  balanceModalOpen.value = true
}

function openProfileModal(member: MemberRow) {
  selectedMember.value = member
  profileDraft.name = member.name || ''
  profileDraft.birthDate = member.birthDate || ''
  profileDraft.bankName = member.bankName || banks[0]
  profileDraft.bankAccount = member.bankAccount || ''
  profileDraft.accountHolder = member.accountHolder || ''
  profileError.value = null
  profileModalOpen.value = true
}

function closeProfileModal() {
  profileModalOpen.value = false
  profileError.value = null
  if (!tradeModalOpen.value && !balanceModalOpen.value) selectedMember.value = null
}

function closeBalanceModal() {
  balanceModalOpen.value = false
  balanceError.value = null
  balanceDraft.value = 0
  if (!tradeModalOpen.value) selectedMember.value = null
}

async function saveBalance() {
  if (!selectedMember.value) return
  const usdt = Number(balanceDraft.value)
  if (!Number.isFinite(usdt) || usdt < 0) {
    balanceError.value = '0 이상 금액만 입력할 수 있습니다.'
    return
  }
  balanceSaving.value = true
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: { userId: selectedMember.value.id, usdt }
    })
    await load(true)
    closeBalanceModal()
  } catch (e: any) {
    balanceError.value = e?.data?.statusMessage || '보유금액 수정에 실패했습니다.'
  } finally {
    balanceSaving.value = false
  }
}

async function saveProfile() {
  if (!selectedMember.value) return
  profileSaving.value = true
  profileError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: selectedMember.value.id,
        name: profileDraft.name,
        birthDate: profileDraft.birthDate,
        bankName: profileDraft.bankName,
        bankAccount: profileDraft.bankAccount,
        accountHolder: profileDraft.accountHolder
      }
    })
    await load(true)
    closeProfileModal()
  } catch (e: any) {
    profileError.value = e?.data?.statusMessage || '회원정보 저장에 실패했습니다.'
  } finally {
    profileSaving.value = false
  }
}

onMounted(async () => {
  await load()
  pollTimer = setInterval(() => {
    if (autoRefreshPaused.value) return
    load(true).catch(() => {})
  }, 1000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
})
</script>

<style scoped>
.date-input {
  position: relative;
  min-width: 140px;
  padding-right: 24px;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}

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
