<template>
  <div class="rounded-2xl border border-white/10 bg-[#030817] px-3 pb-8 pt-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)] sm:px-5">
    <div class="mb-3 flex items-end justify-between gap-3 px-2">
      <h1 class="text-lg font-semibold text-white">{{ t('투자내역', 'Investment History') }}</h1>
      <span v-if="total > 0" class="text-xs text-slate-500">{{ t(`총 ${total.toLocaleString()}건`, `${total.toLocaleString()} records`) }}</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-[15px]">
        <thead>
          <tr class="text-left text-[14px] text-[#6f90b8]">
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('날짜', 'Date') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('심볼', 'Symbol') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('주문 유형', 'Order Type') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('레버리지', 'Leverage') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('체결가격', 'Fill Price') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('체결량', 'Fill Qty') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('실현손익', 'Realized P&L') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('수수료', 'Fee') }}</th>
            <th class="whitespace-nowrap px-2 py-3 font-medium">{{ t('수익인증', 'Proof') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && rows.length === 0">
            <td colspan="9" class="border-t border-white/10 px-2 py-10 text-center text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="9" class="border-t border-white/10 px-2 py-10 text-center text-sm text-slate-400">
              {{ errorText || t('거래 내역이 없습니다.', 'No trade history available.') }}
            </td>
          </tr>
          <tr v-for="tr in rows" :key="`inv-${tr.id}`" class="border-t border-white/10" :class="loading ? 'opacity-60' : ''">
            <td class="whitespace-nowrap px-2 py-[13px] font-bold text-white">{{ formatDate(tr.created_at) }}</td>
            <td class="px-2 py-[13px]">
              <div class="flex items-center gap-2 font-bold text-white">
                <CoinIcon :base="baseCoin(tr.symbol)" :size="20" />
                <span class="whitespace-nowrap">{{ baseCoin(tr.symbol) }}</span>
              </div>
            </td>
            <td class="px-2 py-[13px]">
              <span class="inline-block whitespace-nowrap rounded border px-2 py-[3px] text-[13px] font-bold" :class="typeBadgeClass(tr)">{{ typeLabel(tr) }}</span>
            </td>
            <td class="px-2 py-[13px]">
              <span class="inline-block min-w-[52px] rounded border border-white/25 bg-[#02060f] px-2 py-[3px] text-center text-[13px] font-bold text-white">x{{ Number(tr.leverage) || 1 }}</span>
            </td>
            <td class="whitespace-nowrap px-2 py-[13px] font-bold tabular-nums text-white">{{ fmt2(fillPrice(tr)) }}</td>
            <td class="whitespace-nowrap px-2 py-[13px] font-bold tabular-nums text-white">{{ fmt2(Number(tr.qty)) }}</td>
            <td class="whitespace-nowrap px-2 py-[13px] font-bold tabular-nums">
              <span v-if="tr.kind === 'open'" class="text-slate-500">-</span>
              <span v-else :class="Number(tr.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-500'">{{ pnlText(tr) }}</span>
            </td>
            <td class="whitespace-nowrap px-2 py-[13px] font-bold tabular-nums text-white">
              <span class="inline-flex items-center gap-1.5">
                <span class="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-slate-400 text-[11px] font-black leading-none text-[#030817]">T</span>
                {{ feeText(tr) }}
              </span>
            </td>
            <td class="px-2 py-[13px]">
              <button
                v-if="tr.kind !== 'open' && !isLiquidation(tr)"
                type="button"
                class="whitespace-nowrap rounded-md border border-white/25 bg-[#02060f] px-3 py-1.5 text-[14px] font-bold text-white hover:bg-white/10"
                @click="openCard(tr)"
              >
                {{ t('수익인증', 'Proof') }}
              </button>
              <span v-else class="text-slate-500">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="totalPages > 1" class="mt-7 flex flex-wrap items-center justify-center gap-1.5" :aria-label="t('페이지 이동', 'Pagination')">
      <button type="button" class="pg-btn" :disabled="page <= 1 || loading" @click="goPage(1)">«</button>
      <button type="button" class="pg-btn" :disabled="page <= 1 || loading" @click="goPage(page - 1)">‹</button>
      <template v-for="(p, i) in pageItems" :key="`pg-${i}`">
        <span v-if="p === 0" class="px-2 text-lg font-bold leading-none text-slate-300">•••</span>
        <button v-else type="button" class="pg-btn" :class="p === page ? 'pg-btn-on' : ''" :disabled="loading" @click="goPage(p)">{{ p }}</button>
      </template>
      <button type="button" class="pg-btn" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">›</button>
      <button type="button" class="pg-btn" :disabled="page >= totalPages || loading" @click="goPage(totalPages)">»</button>
    </nav>

    <div v-if="card" class="profit-card-layer fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4" @click.self="card = null">
      <ProfitCardBreaker
        :cb="cardCb"
        :roe="card.roe"
        :pnl="card.pnl"
        :won-number="card.wonNumber"
        :side="card.side"
        :symbol="baseCoin(card.symbol) + 'USDT'"
        :leverage="card.leverage"
        :entry-text="card.entryPrice.toFixed(5)"
        :exit-text="card.exitPrice.toFixed(5)"
        :positive-color="cardStyle.positiveColor"
        :negative-color="cardStyle.negativeColor"
        :bg-image="cardStyle.bgImage"
        fit
        @close="card = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { resolveCb } from '~/utils/cardBreaker'

definePageMeta({ middleware: ['auth'] })

// 투자내역: 선물 거래 내역(진입 = 롱/숏, 청산 = 전체청산/강제청산)을 한 표로 보여준다. 한 페이지에 10건씩.
const { t, locale } = useLocale()
const PAGE_SIZE = 10
// 거래내역 화면(exchange)과 같은 수수료율. 매수 행/청산 행 모두 같은 식으로 계산한다.
const TRADE_FEE_RATE = 0.04

const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const errorText = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

let loadSeq = 0
async function load(p: number) {
  const seq = ++loadSeq
  loading.value = true
  errorText.value = ''
  try {
    const res = await $fetch<any>('/api/trades/history', { query: { limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE } })
    if (seq !== loadSeq) return
    rows.value = Array.isArray(res?.items) ? res.items : []
    total.value = Number(res?.total || 0)
    page.value = p
  } catch (e: any) {
    if (seq !== loadSeq) return
    errorText.value = e?.data?.statusMessage || t('거래 내역을 불러오지 못했습니다.', 'Failed to load trade history.')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}
function goPage(p: number) {
  const next = Math.min(totalPages.value, Math.max(1, p))
  if (next === page.value || loading.value) return
  load(next)
}
onMounted(() => load(1))

// 페이지 번호 줄: 1 … 현재 주변 5개 … 마지막(사이가 한 장 차이면 ••• 대신 그 번호를 보여준다). 0 = •••
const pageItems = computed<number[]>(() => {
  const last = totalPages.value
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const start = Math.min(Math.max(1, page.value - 2), last - 4)
  const keep = new Set<number>([1, last])
  for (let i = start; i < start + 5; i++) keep.add(i)
  const sorted = [...keep].sort((a, b) => a - b)
  const out: number[] = []
  sorted.forEach((p, i) => {
    if (i > 0) {
      const gap = p - sorted[i - 1]
      if (gap === 2) out.push(p - 1)
      else if (gap > 2) out.push(0)
    }
    out.push(p)
  })
  return out
})

function baseCoin(sym: string) {
  return String(sym || '').replace(/USDT$/i, '')
}
function fmt2(v: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v || '')
  return d.toLocaleString(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}
function fillPrice(tr: any) {
  return Number(tr.kind === 'open' ? tr.entry_price : tr.exit_price)
}
function marginOf(tr: any) {
  const entry = Number(tr?.entry_price || 0)
  const qty = Number(tr?.qty || 0)
  const lev = Number(tr?.leverage || 1)
  if (!(entry > 0 && qty > 0 && lev > 0)) return 0
  return (entry * qty) / lev
}
function roeOf(tr: any) {
  const m = marginOf(tr)
  return m > 0 ? (Number(tr.pnl || 0) / m) * 100 : 0
}
function pnlText(tr: any) {
  const pnl = Number(tr.pnl || 0)
  const roe = roeOf(tr)
  return `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} / ${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%`
}
function feeText(tr: any) {
  const net = marginOf(tr)
  if (!(net > 0)) return '—'
  return ((net / (1 - TRADE_FEE_RATE)) * TRADE_FEE_RATE).toFixed(2)
}

// 강제청산: 시스템이 자동으로 판 것만(거래 기록의 표시). 표시 칸이 아예 없는 예전 기록만 "증거금 전액 손실"로 추정한다(거래소 화면과 같은 기준).
function isLiquidation(tr: any) {
  if (tr?.kind === 'open') return false
  const flag = tr?.liquidation
  if (flag === undefined || flag === null) {
    const m = marginOf(tr)
    return m > 0 && Number(tr?.pnl || 0) <= -m * 0.999
  }
  return Boolean(flag)
}
function typeLabel(tr: any) {
  if (tr.kind === 'open') return tr.side === 'short' ? t('숏', 'Short') : t('롱', 'Long')
  return isLiquidation(tr) ? t('강제청산', 'Liquidated') : t('전체청산', 'Closed')
}
function typeBadgeClass(tr: any) {
  const red = 'border-rose-500/40 bg-rose-500/15 text-rose-400'
  const green = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
  if (tr.kind === 'open') return tr.side === 'short' ? red : green
  return isLiquidation(tr) ? red : green
}

// ----- 수익인증 카드 -----
// 카드 디자인(관리자 설정)과 환율은 카드를 처음 열 때 한 번만 받아온다.
const cardStyle = ref<{ positiveColor: string; negativeColor: string; bgImage: string; cb: Record<string, any> }>({
  positiveColor: '#22c55e',
  negativeColor: '#ef4444',
  bgImage: '',
  cb: {}
})
const cardCb = computed(() => resolveCb(cardStyle.value.cb))
let liquidationRoe = -40
let krwRate = 1350
let cardSettingsLoaded = false
async function ensureCardSettings() {
  if (cardSettingsLoaded) return
  const [sys, kr] = await Promise.all([
    $fetch<any>('/api/settings/system').catch(() => null),
    $fetch<{ rate: number }>('/api/settings/krw-rate').catch(() => null)
  ])
  const roe = Number(sys?.liquidationRoe)
  if (Number.isFinite(roe) && roe < 0) liquidationRoe = roe
  if (Number(kr?.rate) > 0) krwRate = Number(kr!.rate)
  const st = sys?.profitCardStyle
  if (st && typeof st === 'object') {
    cardStyle.value = {
      positiveColor: String(st.positiveColor || cardStyle.value.positiveColor),
      negativeColor: String(st.negativeColor || cardStyle.value.negativeColor),
      bgImage: String(st.bgImage || ''),
      cb: st.cb && typeof st.cb === 'object' ? st.cb : {}
    }
  }
  cardSettingsLoaded = !!sys
}

const card = ref<null | {
  symbol: string
  side: 'long' | 'short'
  leverage: number
  entryPrice: number
  exitPrice: number
  pnl: number
  roe: number
  wonNumber: string
}>(null)

async function openCard(tr: any) {
  if (tr.kind === 'open' || isLiquidation(tr)) return
  await ensureCardSettings()
  const pnl = Number(tr.pnl || 0)
  card.value = {
    symbol: String(tr.symbol),
    side: tr.side === 'short' ? 'short' : 'long',
    leverage: Number(tr.leverage || 1),
    entryPrice: Number(tr.entry_price || 0),
    exitPrice: Number(tr.exit_price || 0),
    pnl,
    roe: Math.max(liquidationRoe, roeOf(tr)),
    wonNumber: Math.abs(Math.round(pnl * krwRate)).toLocaleString()
  }
}
</script>

<style scoped>
.pg-btn {
  display: inline-flex;
  height: 34px;
  min-width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #02060f;
  padding: 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}
.pg-btn:hover:not(:disabled):not(.pg-btn-on) {
  background: rgba(255, 255, 255, 0.08);
}
.pg-btn:disabled {
  cursor: not-allowed;
  color: #475569;
}
.pg-btn-on {
  background: #fff;
  border-color: #fff;
  color: #0b1220;
}
</style>
