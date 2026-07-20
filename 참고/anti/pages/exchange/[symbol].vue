<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ symbol }}</h1>
        <p class="mt-1 text-sm text-slate-400">
          실시간 시세 차트 및 Perpetual 거래 시스템
        </p>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div class="text-xs text-slate-400">현재가</div>
        <div class="mt-1 font-mono text-2xl">{{ lastPrice ? lastPrice.toFixed(2) : '—' }}</div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">차트</h2>
          <div class="text-xs text-slate-400">간단 라인차트(틱 기반)</div>
        </div>
        <div ref="chartEl" class="mt-3 h-[360px] w-full overflow-hidden rounded-xl bg-black/40"></div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">호가(상위 10)</h2>
          <button class="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15" @click="reconnect">재연결</button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="mb-2 text-slate-400">매도</div>
            <div v-for="a in asks" :key="a[0]" class="flex justify-between font-mono">
              <span class="text-rose-300">{{ a[0] }}</span>
              <span class="text-slate-300">{{ a[1] }}</span>
            </div>
          </div>
          <div>
            <div class="mb-2 text-slate-400">매수</div>
            <div v-for="b in bids" :key="b[0]" class="flex justify-between font-mono">
              <span class="text-emerald-300">{{ b[0] }}</span>
              <span class="text-slate-300">{{ b[1] }}</span>
            </div>
          </div>
        </div>
        <p v-if="wsStatus" class="mt-3 text-xs text-slate-500">WS: {{ wsStatus }}</p>
      </section>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-1">
        <h2 class="font-semibold">Perpetual 거래</h2>
        <p class="mt-1 text-sm text-slate-400">선물 증거금(USDT)과 레버리지 설정을 바탕으로 포지션을 오픈합니다.</p>

        <div v-if="!me" class="mt-4 rounded-xl bg-black/20 p-4 text-sm text-slate-300">
          거래하려면 <NuxtLink to="/auth/login" class="text-indigo-300 hover:underline">로그인</NuxtLink>이 필요합니다.
        </div>

        <form v-else class="mt-4 space-y-3" @submit.prevent="openPosition">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium"
              :class="side === 'long' ? 'bg-emerald-500/20 ring-1 ring-emerald-400' : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'"
              @click="side = 'long'"
            >
              롱
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium"
              :class="side === 'short' ? 'bg-rose-500/20 ring-1 ring-rose-400' : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'"
              @click="side = 'short'"
            >
              숏
            </button>
          </div>
          <div>
            <label class="text-sm text-slate-300">증거금 (USDT)</label>
            <input v-model.number="margin" type="number" min="1" step="1" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">레버리지</label>
            <input v-model.number="leverage" type="number" min="1" max="100" step="1" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400" :disabled="loading">
            포지션 오픈
          </button>
          <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
        </form>

        <div v-if="me" class="mt-4 rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">가상 잔고</div>
          <div class="mt-1 font-mono text-xl">{{ balance.toFixed(2) }} USDT</div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2 flex flex-col min-h-[350px]">
        <!-- Tabs Header -->
        <div class="border-b border-white/10 pb-2 mb-4 flex justify-between items-center">
          <div class="flex flex-wrap gap-4 text-sm font-medium">
            <button 
              @click="activeTab = 'positions'" 
              class="relative py-2 px-1 transition duration-150"
              :class="activeTab === 'positions' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
            >
              포지션 ({{ positions.length }})
              <span v-if="activeTab === 'positions'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            </button>
            <button 
              class="py-2 px-1 text-slate-600 cursor-not-allowed"
              disabled
            >
              카피 중인 매매 (0)
            </button>
            <button 
              @click="activeTab = 'trades'" 
              class="relative py-2 px-1 transition duration-150"
              :class="activeTab === 'trades' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
            >
              거래내역 ({{ trades.length }})
              <span v-if="activeTab === 'trades'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            </button>
            <button 
              @click="onSelectExecutionsTab" 
              class="relative py-2 px-1 transition duration-150"
              :class="activeTab === 'executions' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
            >
              체결내역
              <span v-if="activeTab === 'executions'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            </button>
          </div>
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 transition" @click="refreshActiveTab">새로고침</button>
        </div>

        <!-- Tab Contents: Positions -->
        <div v-if="activeTab === 'positions'" class="space-y-2 overflow-y-auto max-h-[400px] pr-1">
          <div v-if="positions.length === 0" class="text-sm text-slate-400 py-4">오픈 포지션이 없습니다.</div>
          <div v-for="p in positions" :key="p.id" class="rounded-xl bg-black/20 p-4 text-sm border border-white/5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-medium flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="p.side === 'long' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'">
                  {{ p.side.toUpperCase() }}
                </span>
                <span class="font-mono text-slate-200 font-bold">{{ formatSymbol(p.symbol) }}</span>
                <span class="text-slate-500 font-mono text-xs">x{{ p.leverage }}</span>
              </div>
              <button class="rounded-md bg-amber-500/20 px-3 py-1 text-xs font-semibold ring-1 ring-amber-400/50 hover:bg-amber-500/30 text-amber-300 transition" @click="closePosition(p.id)">
                시장가 청산
              </button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400">
              <div class="flex justify-between border-b border-white/5 pb-1"><span>수량:</span> <span class="font-mono text-slate-200">{{ formatQty(p.qty) }}</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>진입가:</span> <span class="font-mono text-slate-200">{{ formatPrice(p.entry_price) }}</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>증거금:</span> <span class="font-mono text-slate-200">{{ Number(p.margin).toFixed(2) }} USDT</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>진입시간:</span> <span class="font-mono text-slate-200">{{ p.created_at.slice(0, 19).replace('T', ' ') }}</span></div>
            </div>
          </div>
        </div>

        <!-- Tab Contents: Trades -->
        <div v-if="activeTab === 'trades'" class="space-y-2 overflow-y-auto max-h-[400px] pr-1">
          <div v-if="trades.length === 0" class="text-sm text-slate-400 py-4">거래내역이 없습니다.</div>
          <div v-for="t in trades" :key="t.id" class="rounded-xl bg-black/20 p-4 text-sm border border-white/5">
            <div class="flex justify-between">
              <div class="font-medium flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="t.side === 'long' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'">
                  {{ t.side.toUpperCase() }}
                </span>
                <span class="font-mono text-slate-200 font-bold">{{ formatSymbol(t.symbol) }}</span>
                <span class="text-slate-500 font-mono text-xs">x{{ t.leverage }}</span>
              </div>
              <div class="font-mono font-bold text-sm" :class="t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ t.pnl >= 0 ? '+' : '' }}{{ Number(t.pnl).toFixed(2) }} USDT
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400">
              <div class="flex justify-between border-b border-white/5 pb-1"><span>수량:</span> <span class="font-mono text-slate-200">{{ formatQty(t.qty) }}</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>진입/종료:</span> <span class="font-mono text-slate-200">{{ formatPrice(t.entry_price) }} → {{ formatPrice(t.exit_price) }}</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>시간:</span> <span class="font-mono text-slate-200">{{ formatTime(t.created_at) }}</span></div>
              <div class="flex justify-between border-b border-white/5 pb-1"><span>거래ID:</span> <span class="font-mono text-slate-200">#{{ t.id }}</span></div>
            </div>
          </div>
        </div>

        <!-- Tab Contents: Executions -->
        <div v-if="activeTab === 'executions'" class="overflow-y-auto max-h-[400px] pr-1 space-y-2" @scroll="onExecutionsScroll">
          <div v-if="executions.length === 0" class="text-sm text-slate-400 py-4 text-center">체결내역이 없습니다.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr class="text-slate-400 border-b border-white/10">
                  <th class="py-2 pb-3 font-semibold">시간</th>
                  <th class="py-2 pb-3 font-semibold">종목</th>
                  <th class="py-2 pb-3 font-semibold text-center">방향</th>
                  <th class="py-2 pb-3 font-semibold text-right">체결가</th>
                  <th class="py-2 pb-3 font-semibold text-right">수량</th>
                  <th class="py-2 pb-3 font-semibold text-right">수수료</th>
                  <th class="py-2 pb-3 font-semibold text-right">실현손익</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ex in executions" :key="ex.id" class="border-b border-white/5 hover:bg-white/5 font-mono text-slate-300">
                  <td class="py-3 text-slate-400">{{ formatTime(ex.created_at) }}</td>
                  <td class="py-3 font-semibold text-slate-200">{{ formatSymbol(ex.symbol) }}</td>
                  <td class="py-3 text-center">
                    <span :class="ex.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'" class="px-2 py-0.5 rounded text-[10px] font-bold">
                      {{ ex.side }}
                    </span>
                  </td>
                  <td class="py-3 text-right font-semibold text-slate-200">{{ formatPrice(ex.price) }}</td>
                  <td class="py-3 text-right text-slate-200">{{ formatQty(ex.qty) }}</td>
                  <td class="py-3 text-right text-slate-400">{{ ex.fee.toFixed(6) }} USDT</td>
                  <td class="py-3 text-right font-bold" :class="ex.pnl > 0 ? 'text-emerald-400' : ex.pnl < 0 ? 'text-rose-400' : 'text-slate-500'">
                    {{ ex.pnl > 0 ? '+' : '' }}{{ ex.pnl !== 0 ? ex.pnl.toFixed(4) + ' USDT' : '0 USDT' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="loadingExecutions" class="text-center text-xs text-slate-500 py-3 font-mono">불러오는 중...</div>
        </div>
      </section>
    </div>
  </div>

  <!-- Premium Close Result Modal Card -->
  <div v-if="isCloseModalOpen && closeModalData" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4" @click.self="closeCloseModal">
    <div class="relative w-full max-w-sm rounded-3xl p-8 overflow-hidden shadow-2xl border border-white/10 transition duration-300" 
         :class="closeModalData.pnl >= 0 ? 'bg-gradient-to-b from-[#0d382f] via-[#05211b] to-[#021310] shadow-emerald-950/30' : 'bg-gradient-to-b from-[#4a131b] via-[#2c0b10] to-[#140407] shadow-rose-950/30'">
      
      <!-- Background decorative blobs -->
      <div class="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20" :class="closeModalData.pnl >= 0 ? 'bg-emerald-400' : 'bg-rose-400'"></div>
      <div class="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20" :class="closeModalData.pnl >= 0 ? 'bg-teal-400' : 'bg-rose-500'"></div>

      <!-- Close Button -->
      <button class="absolute top-5 right-5 text-white/50 hover:text-white text-xl transition font-sans" @click="closeCloseModal">
        ✕
      </button>

      <!-- ROI & PNL Header -->
      <div class="text-left space-y-1">
        <div class="text-4xl font-bold tracking-tight" :class="closeModalData.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ calculateRoe(closeModalData) }}
        </div>
        <div class="text-2xl font-bold font-mono" :class="closeModalData.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ formatPnlWon(closeModalData.pnl) }}
        </div>
        <div class="text-sm text-white/60 font-mono">
          ({{ closeModalData.pnl >= 0 ? '+' : '' }}{{ closeModalData.pnl.toFixed(2) }} USDT)
        </div>
      </div>

      <!-- Detail Table -->
      <div class="mt-8 space-y-4 border-t border-white/10 pt-6 text-left">
        <div>
          <div class="text-[11px] uppercase tracking-wider text-white/40">코인</div>
          <div class="mt-0.5 text-base font-semibold">
            {{ formatSymbol(closeModalData.symbol) }}
            <span :class="closeModalData.side === 'long' ? 'text-emerald-400' : 'text-rose-400'" class="ml-1 text-sm font-bold">
              {{ closeModalData.side.toUpperCase() }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-wider text-white/40">레버리지</div>
          <div class="mt-0.5 text-base font-semibold">{{ closeModalData.leverage }}x</div>
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-wider text-white/40">진입가격</div>
          <div class="mt-0.5 text-base font-mono font-medium text-white/90">{{ formatPrice(closeModalData.entryPrice) }}</div>
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-wider text-white/40">종료가격</div>
          <div class="mt-0.5 text-base font-mono font-medium text-white/90">{{ formatPrice(closeModalData.exitPrice) }}</div>
        </div>
      </div>

      <div class="mt-8 text-center text-[10px] text-white/30 uppercase tracking-widest font-mono">
        UsdtFuture Perpetual Trading
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createChart, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'

const route = useRoute()
const symbol = computed(() => String(route.params.symbol || 'BTCUSDT').toUpperCase())

const { me, refresh: refreshMe } = useMe()
await refreshMe()

const chartEl = ref<HTMLElement | null>(null)
let chart: IChartApi | null = null
let series: ISeriesApi<'Line'> | null = null

const lastPrice = ref<number | null>(null)
const asks = ref<[string, string][]>([])
const bids = ref<[string, string][]>([])
const wsStatus = ref('')
let ws: WebSocket | null = null

const side = ref<'long' | 'short'>('long')
const margin = ref<number>(100)
const leverage = ref<number>(20)
const loading = ref(false)
const error = ref<string | null>(null)
const tradeMsg = ref<string | null>(null)

const balance = ref(0)
const positions = ref<any[]>([])

function toInstId(sym: string) {
  const s = sym.toUpperCase().replace('-', '').replace('/', '')
  if (s === 'BTCUSDT') return 'BTC-USDT'
  if (s === 'ETHUSDT') return 'ETH-USDT'
  return 'BTC-USDT'
}

function connectWs() {
  if (!process.client) return
  ws?.close()
  asks.value = []
  bids.value = []
  wsStatus.value = 'connecting'

  const instId = toInstId(symbol.value)
  ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')

  ws.onopen = () => {
    wsStatus.value = 'open'
    ws?.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          { channel: 'tickers', instId },
          { channel: 'books5', instId }
        ]
      })
    )
  }

  ws.onclose = () => {
    wsStatus.value = 'closed'
  }
  ws.onerror = () => {
    wsStatus.value = 'error'
  }

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      const arg = msg?.arg
      const data = msg?.data?.[0]
      if (!arg || !data) return

      if (arg.channel === 'tickers') {
        const p = Number(data.last)
        if (Number.isFinite(p)) {
          lastPrice.value = p
          pushChart(p)
        }
      }
      if (arg.channel === 'books5') {
        const a = (data.asks || []).slice(0, 10).map((x: any[]) => [x[0], x[1]] as [string, string])
        const b = (data.bids || []).slice(0, 10).map((x: any[]) => [x[0], x[1]] as [string, string])
        asks.value = a.reverse() // 보기 좋게 위가 높은 호가
        bids.value = b
      }
    } catch {
      // ignore
    }
  }
}

function reconnect() {
  connectWs()
}

function initChart() {
  if (!chartEl.value || chart) return
  chart = createChart(chartEl.value, {
    layout: { background: { color: 'transparent' }, textColor: '#cbd5e1' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.12)', timeVisible: true, secondsVisible: true }
  })
  series = chart.addLineSeries({ color: '#a5b4fc', lineWidth: 2 })
}

function pushChart(price: number) {
  if (!series) return
  const t = Math.floor(Date.now() / 1000)
  const point: LineData = { time: t as any, value: price }
  series.update(point)
}

const activeTab = ref<'positions' | 'trades' | 'executions'>('positions')

const executions = ref<any[]>([])
const executionsLimit = 20
const executionsOffset = ref(0)
const hasMoreExecutions = ref(true)
const loadingExecutions = ref(false)

const isCloseModalOpen = ref(false)
const closeModalData = ref<any>(null)

function showCloseModal(data: any) {
  closeModalData.value = data
  isCloseModalOpen.value = true
}

function closeCloseModal() {
  isCloseModalOpen.value = false
  closeModalData.value = null
}

function calculateRoe(data: any) {
  const diff = data.side === 'long' 
    ? (data.exitPrice - data.entryPrice)
    : (data.entryPrice - data.exitPrice);
  const percent = (diff / data.entryPrice) * data.leverage * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function formatPnlWon(pnl: number) {
  const krw = Math.round(pnl * 1400); // 1 USDT = 1400 KRW
  return `${krw >= 0 ? '+' : ''}${krw.toLocaleString()} WON`;
}

function formatSymbol(sym: string) {
  return sym.replace('-USDT-SWAP', '').replace('USDT', '') + '/USDT';
}

function formatPrice(val: number) {
  if (val < 1) return val.toFixed(5);
  if (val < 100) return val.toFixed(4);
  return val.toFixed(2);
}

function formatTime(isoStr: string) {
  if (!isoStr) return '';
  return isoStr.replace('T', ' ').slice(0, 19);
}

function formatQty(val: number) {
  if (val < 1) return val.toFixed(4);
  if (val < 1000) return val.toFixed(2);
  return Math.round(val).toLocaleString();
}

async function loadExecutions(reset = false) {
  if (!me.value) return
  if (reset) {
    executionsOffset.value = 0
    executions.value = []
    hasMoreExecutions.value = true
  }
  if (!hasMoreExecutions.value || loadingExecutions.value) return

  loadingExecutions.value = true
  try {
    const data = await $fetch<any>('/api/executions', {
      query: { limit: executionsLimit, offset: executionsOffset.value }
    })
    if (data.executions.length < executionsLimit) {
      hasMoreExecutions.value = false
    }
    executions.value = [...executions.value, ...data.executions]
    executionsOffset.value += data.executions.length
  } catch (err) {
    console.error('Failed to load executions:', err)
  } finally {
    loadingExecutions.value = false
  }
}

function onExecutionsScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
    loadExecutions()
  }
}

function onSelectExecutionsTab() {
  activeTab.value = 'executions'
  loadExecutions(true)
}

async function refreshActiveTab() {
  await loadAccount()
  if (activeTab.value === 'executions') {
    await loadExecutions(true)
  }
}

async function loadAccount() {
  if (!me.value) return
  const data = await $fetch<any>('/api/account')
  balance.value = data.balance.usdt
  positions.value = data.positions
  trades.value = data.trades
}

async function openPosition() {
  if (!me.value) return
  loading.value = true
  error.value = null
  tradeMsg.value = null
  try {
    await $fetch('/api/trade/open', {
      method: 'POST',
      body: { symbol: symbol.value, side: side.value, margin: margin.value, leverage: leverage.value }
    })
    tradeMsg.value = '포지션이 오픈되었습니다.'
    await loadAccount()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '오픈 실패'
  } finally {
    loading.value = false
  }
}

async function closePosition(positionId: number) {
  tradeMsg.value = null
  try {
    const res = await $fetch<any>('/api/trade/close', { method: 'POST', body: { positionId } })
    showCloseModal(res)
    await loadAccount()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '청산 실패'
  }
}

onMounted(async () => {
  initChart()
  connectWs()
  await loadAccount()
})

onBeforeUnmount(() => {
  ws?.close()
  ws = null
})
</script>

