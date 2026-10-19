<template>
  <div class="font-landing space-y-8 pb-6">
    <div v-if="loading" class="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-slate-500">{{ t('불러오는 중…', 'Loading…') }}</div>
    <div v-else-if="error" class="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-rose-300">{{ error }}</div>

    <template v-else-if="overview">
      <!-- AI Trading Signal Radar: 왼쪽으로 계속 흐르고, 양끝은 서서히 사라진다 -->
      <section>
        <h2 class="text-[15px] font-medium text-white">AI Trading Signal Radar</h2>
        <div class="radar-mask mt-3 overflow-hidden" @mouseenter="radarPaused = true" @mouseleave="radarPaused = false">
          <div class="radar-track" :style="{ transform: `translateX(-${radarIdx * RADAR_STEP}px)`, transition: radarAnim ? 'transform 600ms ease-in-out' : 'none' }">
            <div v-for="(c, i) in radarLoop" :key="`${c.symbol}-${i}`" class="mr-4 shrink-0">
              <SignalCard :item="c" />
            </div>
          </div>
        </div>
      </section>

      <!-- 탭 -->
      <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <button
          v-for="tab in topTabs"
          :key="tab.key"
          type="button"
          class="text-[22px] font-medium transition"
          :class="topTab === tab.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
          @click="topTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="topTab !== 'market'" class="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-16 text-center text-slate-400">
        {{ t('준비 중입니다.', 'Coming soon.') }}
      </div>

      <template v-else>
        <!-- 요약 카드 -->
        <section class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('시가총액', 'Market Cap') }}</div>
            <div class="mt-2 text-[15px] text-white">
              {{ stats?.marketCapUsd ? fmtUsdShort(stats.marketCapUsd) : '—' }}
              <span v-if="stats?.marketCapChangePct != null" class="ml-1 text-[12px]" :class="stats.marketCapChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ stats.marketCapChangePct >= 0 ? '+' : '' }}{{ stats.marketCapChangePct.toFixed(2) }}% {{ stats.marketCapChangePct >= 0 ? '▲' : '▼' }}
              </span>
            </div>
          </div>

          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('공포·탐욕 지수', 'Fear & Greed Index') }}</div>
            <div class="mt-1 flex flex-col items-center">
              <svg viewBox="0 0 120 70" class="h-[62px] w-[110px]" aria-hidden="true">
                <defs>
                  <linearGradient id="fg-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#ef4444" />
                    <stop offset="50%" stop-color="#f0b90b" />
                    <stop offset="100%" stop-color="#22c55e" />
                  </linearGradient>
                </defs>
                <path d="M 14 62 A 46 46 0 0 1 106 62" fill="none" stroke="url(#fg-grad)" stroke-width="7" stroke-linecap="round" />
                <circle v-if="stats?.fearGreed" :cx="fgDot.x" :cy="fgDot.y" r="4" fill="#ffffff" stroke="#111827" stroke-width="1.5" />
              </svg>
              <div class="-mt-6 text-center">
                <div class="text-[20px] font-bold text-amber-400">{{ stats?.fearGreed ? stats.fearGreed.value : '—' }}</div>
                <div class="text-[12px] text-slate-400">{{ stats?.fearGreed?.label || '' }}</div>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('24시간 미결제약정', '24h Open Interest') }}</div>
            <div class="mt-2 text-[15px] text-white">{{ stats?.openInterestUsd ? fmtUsdShort(stats.openInterestUsd) : '—' }}</div>
          </div>

          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('24시간 거래대금', '24h Volume') }}</div>
            <div class="mt-2 text-[15px] text-white">{{ fmtUsdShort(overview.totalVolUsd) }}</div>
            <div class="mt-1 text-[12px] text-slate-400">{{ overview.totalCount }} {{ t('종목', 'markets') }}</div>
          </div>

          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('상승 / 하락 종목', 'Gainers / Losers') }}</div>
            <div class="mt-2 text-[15px] text-white">
              <span class="text-emerald-400">{{ overview.upCount }}</span>
              <span class="text-slate-500"> / </span>
              <span class="text-rose-400">{{ overview.downCount }}</span>
            </div>
            <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
              <div class="bg-emerald-500" :style="{ width: upsharePct + '%' }" />
              <div class="bg-rose-500" :style="{ width: 100 - upsharePct + '%' }" />
            </div>
          </div>

          <div class="rounded-xl bg-white/[0.04] p-4">
            <div class="text-[14px] text-slate-300">{{ t('BTC 거래 비중', 'BTC Volume Share') }}</div>
            <div class="mt-2 text-[15px] text-white">{{ overview.btcSharePct.toFixed(1) }}%</div>
          </div>
        </section>

        <!-- 4개 목록 -->
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="box in listBoxes" :key="box.key" class="rounded-2xl border border-white/10 p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-[17px] font-medium text-white">{{ box.title }} <span class="text-slate-400">›</span></h3>
              <span class="rounded-md bg-white/[0.06] px-3 py-1 text-[13px] text-white">Future</span>
            </div>
            <div class="mt-4 space-y-4">
              <NuxtLink v-for="r in box.rows" :key="r.symbol" :to="`/exchange/${r.symbol}`" class="flex items-center justify-between gap-3 hover:opacity-80">
                <span class="flex min-w-0 items-center gap-3">
                  <CoinIcon :base="r.base" :size="26" />
                  <span class="truncate text-[15px] text-white">{{ r.base }}/USDT</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block font-mono text-[14px] text-white">{{ fmtMarketPrice(r.price) }}</span>
                  <span class="block text-[12px]" :class="r.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ r.changePct > 0 ? '+' : '' }}{{ r.changePct.toFixed(2) }}%</span>
                </span>
              </NuxtLink>
            </div>
          </div>
        </section>

        <!-- 시세 표 -->
        <section>
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
            <div class="flex flex-wrap gap-5 text-[16px]">
              <button
                v-for="tab in categoryTabs"
                :key="tab.key"
                type="button"
                class="-mb-px border-b-2 pb-2 transition"
                :class="activeCategory === tab.key ? 'border-[#f0b90b] font-medium text-white' : 'border-transparent text-slate-500 hover:text-slate-300'"
                @click="activeCategory = tab.key; page = 1"
              >
                {{ tab.label }}
              </button>
            </div>
            <div class="relative pb-2">
              <span class="pointer-events-none absolute left-3 top-[40%] -translate-y-1/2 text-slate-500">⌕</span>
              <input
                v-model.trim="keyword"
                class="w-full rounded-md border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#f0b90b] sm:w-56"
                :placeholder="t('종목 검색', 'Search symbols')"
                :key="`markets-search-${locale}`"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-1 text-[14px]">
            <button
              v-for="preset in sortPresets"
              :key="preset.key"
              type="button"
              class="rounded-md px-3 py-1.5 transition"
              :class="activePreset === preset.key ? 'bg-white/10 font-medium text-white' : 'text-slate-400 hover:text-white'"
              @click="applyPreset(preset.key)"
            >
              {{ preset.label }}
            </button>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[980px] text-[14px]">
              <thead class="text-slate-400">
                <tr class="text-left">
                  <th class="cursor-pointer select-none py-3 pl-2 font-normal" @click="toggleSort('name')">{{ t('이름', 'Name') }}{{ sortArrow('name') }}</th>
                  <th class="cursor-pointer select-none px-2 py-3 text-right font-normal" @click="toggleSort('price')">{{ t('현재가', 'Last Price') }}{{ sortArrow('price') }}</th>
                  <th class="w-[110px] px-2 py-3"></th>
                  <th class="cursor-pointer select-none px-2 py-3 text-right font-normal" @click="toggleSort('change')">{{ t('24시간 변동', '24H Change') }}{{ sortArrow('change') }}</th>
                  <th class="cursor-pointer select-none px-2 py-3 text-right font-normal" @click="toggleSort('high')">{{ t('24시간 고가', '24H High') }}{{ sortArrow('high') }}</th>
                  <th class="cursor-pointer select-none px-2 py-3 text-right font-normal" @click="toggleSort('low')">{{ t('24시간 저가', '24H Low') }}{{ sortArrow('low') }}</th>
                  <th class="cursor-pointer select-none px-2 py-3 text-right font-normal" @click="toggleSort('volume')">{{ t('24시간 거래대금', '24H Vol') }}{{ sortArrow('volume') }}</th>
                  <th class="py-3 pl-2 pr-3 text-right font-normal">{{ t('거래', 'Action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedItems.length === 0">
                  <td colspan="8" class="px-4 py-10 text-center text-slate-500">{{ t('종목이 없습니다.', 'No symbols available.') }}</td>
                </tr>
                <tr v-for="item in pagedItems" :key="item.symbol" class="hover:bg-white/[0.03]">
                  <td class="py-3 pl-2">
                    <div class="flex items-center gap-3">
                      <button type="button" class="text-lg leading-none" :class="isFavorite(item.symbol) ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'" @click="toggleFavorite(item.symbol)">
                        {{ isFavorite(item.symbol) ? '★' : '☆' }}
                      </button>
                      <NuxtLink :to="`/exchange/${item.symbol}`" class="flex items-center gap-3">
                        <CoinIcon :base="item.base" :size="30" />
                        <span>
                          <span class="block font-semibold text-white">{{ item.base }}/USDT</span>
                          <span class="block text-[12px] text-slate-400">{{ item.name }}</span>
                        </span>
                      </NuxtLink>
                    </div>
                  </td>
                  <td class="px-2 py-3 text-right font-mono text-white">{{ fmtMarketPrice(item.price) }}</td>
                  <td class="px-2 py-3">
                    <MiniSparkline :values="spark[item.symbol] || []" :up="item.changePct >= 0" :width="96" :height="40" />
                  </td>
                  <td class="px-2 py-3 text-right font-mono" :class="item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                    {{ item.changePct >= 0 ? '+ ' : '- ' }}{{ Math.abs(item.changePct).toFixed(2) }}% <span class="text-[10px]">{{ item.changePct >= 0 ? '▲' : '▼' }}</span>
                  </td>
                  <td class="px-2 py-3 text-right font-mono text-white">{{ item.high24h ? fmtMarketPrice(item.high24h) : '—' }}</td>
                  <td class="px-2 py-3 text-right font-mono text-white">{{ item.low24h ? fmtMarketPrice(item.low24h) : '—' }}</td>
                  <td class="px-2 py-3 text-right font-mono text-white">{{ fmtMarketVolume(item.volUsd) }}</td>
                  <td class="py-3 pl-2 pr-3">
                    <div class="flex items-center justify-end gap-4">
                      <NuxtLink :to="`/exchange/${item.symbol}`" class="text-[14px] text-amber-400 hover:text-amber-300">{{ t('상세', 'Detail') }}</NuxtLink>
                      <NuxtLink :to="`/exchange/${item.symbol}`" class="rounded-md bg-[#f0b90b] px-4 py-1.5 text-[14px] font-medium text-[#383A3E] hover:bg-[#d9a609]">{{ t('거래', 'Trade') }}</NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 페이지 넘김 -->
          <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2.5">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30"
              :disabled="page <= 1"
              :aria-label="t('이전', 'Previous')"
              @click="goPage(page - 1)"
            >
              ‹
            </button>
            <template v-for="(p, i) in pageItems" :key="`pg-${i}-${p}`">
              <span v-if="p === '…'" class="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300">•••</span>
              <button
                v-else
                type="button"
                class="flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-[15px]"
                :class="p === page ? 'border-[#f0b90b] bg-[#f0b90b] font-bold text-[#383A3E]' : 'border-white/10 text-white hover:bg-white/5'"
                @click="goPage(p as number)"
              >
                {{ p }}
              </button>
            </template>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30"
              :disabled="page >= totalPages"
              :aria-label="t('다음', 'Next')"
              @click="goPage(page + 1)"
            >
              ›
            </button>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MarketItem } from '../../composables/useMarketOverview'

definePageMeta({ middleware: ['auth'] })

type MarketInstrument = MarketItem & { instId: string; categoryLabel: string }
type MarketOverview = {
  items: MarketInstrument[]
  totalVolUsd: number
  totalCount: number
  btcSharePct: number
  upCount: number
  downCount: number
  flatCount: number
  topGainers: MarketInstrument[]
  topLosers: MarketInstrument[]
  categoryCounts: Record<MarketInstrument['category'], number>
}
type Stats = {
  marketCapUsd: number | null
  marketCapChangePct: number | null
  fearGreed: { value: number; label: string } | null
  openInterestUsd: number | null
}

const { t, locale } = useLocale()
const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<MarketOverview | null>(null)
const stats = ref<Stats | null>(null)

async function load(initial = false) {
  if (initial) loading.value = true
  error.value = null
  try {
    overview.value = await $fetch<MarketOverview>('/api/markets/overview')
  } catch (e: any) {
    if (initial || !overview.value) error.value = e?.data?.statusMessage || t('마켓 정보를 불러오지 못했습니다.', 'Failed to load market information.')
  } finally {
    loading.value = false
  }
}
await load(true)

async function loadStats() {
  try {
    stats.value = await $fetch<Stats>('/api/markets/stats')
  } catch {
    // 요약 카드는 없어도 나머지 화면은 보인다
  }
}

let refreshTimer: any = null
onMounted(() => {
  startRadar()
  loadFavorites()
  loadStats()
  refreshTimer = setInterval(() => load(false), 20_000)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (radarTimer) clearInterval(radarTimer)
  if (radarResetTimer) clearTimeout(radarResetTimer)
})

const upsharePct = computed(() => {
  if (!overview.value || overview.value.totalCount === 0) return 50
  return (overview.value.upCount / overview.value.totalCount) * 100
})

// ── 상단 탭(Market만 실제 화면) ──
type TopTab = 'market' | 'leaderboard' | 'insight' | 'anomaly'
const topTab = ref<TopTab>('market')
const topTabs = computed(() => [
  { key: 'market' as TopTab, label: t('마켓', 'Market') },
  { key: 'leaderboard' as TopTab, label: 'Leaderboard' },
  { key: 'insight' as TopTab, label: 'X Insight' },
  { key: 'anomaly' as TopTab, label: 'Market Anomaly' }
])

// ── 시그널 레이더(좌로 흐르는 카드) ──
const radarItems = computed<MarketItem[]>(() => {
  const coins = (overview.value?.items ?? []).filter((i) => i.category === 'coin' && i.price > 0).sort((a, b) => b.volUsd - a.volUsd).slice(0, 80)
  return coins.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 14)
})
// 끊김 없이 이어지도록 같은 목록을 두 번 이어 붙이고, 절반만큼 이동시키는 애니메이션을 쓴다.
const radarLoop = computed(() => [...radarItems.value, ...radarItems.value])
// 2초마다 카드 한 장씩 왼쪽으로 이동. 한 바퀴(원래 목록 길이)를 돌면 애니메이션 없이 처음 위치로 되돌려 끊김 없이 이어 보이게 한다.
const RADAR_STEP = 286 // 카드 270px + 간격 16px
const radarIdx = ref(0)
const radarAnim = ref(true)
const radarPaused = ref(false)
let radarTimer: any = null
let radarResetTimer: any = null
function startRadar() {
  radarTimer = setInterval(() => {
    const n = radarItems.value.length
    if (radarPaused.value || n < 2) return
    radarAnim.value = true
    radarIdx.value++
    if (radarIdx.value >= n) {
      radarResetTimer = setTimeout(() => {
        radarAnim.value = false
        radarIdx.value = 0
      }, 700)
    }
  }, 2000)
}

// ── 공포·탐욕 게이지 위 점 위치(반원 위를 0~100으로) ──
const fgDot = computed(() => {
  const v = Math.min(100, Math.max(0, stats.value?.fearGreed?.value ?? 0))
  const ang = Math.PI * (1 - v / 100)
  return { x: 60 + 46 * Math.cos(ang), y: 62 - 46 * Math.sin(ang) }
})

// ── 4개 목록 ──
const listBoxes = computed(() => {
  const items = overview.value?.items ?? []
  const coins = items.filter((i) => i.category === 'coin' && i.price > 0)
  const liquid = [...coins].sort((a, b) => b.volUsd - a.volUsd).slice(0, 80)
  return [
    { key: 'trending', title: 'Trending', rows: [...coins].sort((a, b) => b.volUsd - a.volUsd).slice(0, 4) },
    { key: 'new', title: 'New Listing', rows: [...items].filter((i) => (i.listTime || 0) > 0 && i.price > 0).sort((a, b) => (b.listTime || 0) - (a.listTime || 0)).slice(0, 4) },
    { key: 'gainers', title: 'Gainers', rows: [...liquid].sort((a, b) => b.changePct - a.changePct).slice(0, 4) },
    { key: 'losers', title: 'Losers', rows: [...liquid].sort((a, b) => a.changePct - b.changePct).slice(0, 4) }
  ]
})

// ── 시세 표 ──
type CategoryKey = 'all' | 'favorite' | MarketInstrument['category']
const activeCategory = ref<CategoryKey>('all')
const categoryTabs = computed(() => [
  { key: 'favorite' as CategoryKey, label: t('즐겨찾기', 'Favorites') },
  { key: 'all' as CategoryKey, label: t('전체', 'All') },
  { key: 'coin' as CategoryKey, label: t('암호화폐', 'Crypto') },
  { key: 'stock' as CategoryKey, label: t('해외주식', 'Stocks') },
  { key: 'etf' as CategoryKey, label: 'ETF' },
  { key: 'commodity' as CategoryKey, label: t('원자재', 'Metals') },
  { key: 'krStock' as CategoryKey, label: t('국내주식', 'KR Stocks') }
])

// 즐겨찾기: 로그인 계정과 무관하게 이 브라우저에만 저장(가벼운 클라이언트 전용 기능)
const FAVORITES_KEY = 'usdetrade_market_favorites'
const favorites = ref<string[]>([])
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    favorites.value = raw ? JSON.parse(raw) : []
  } catch {
    favorites.value = []
  }
}
function isFavorite(symbol: string) {
  return favorites.value.includes(symbol)
}
function toggleFavorite(symbol: string) {
  const next = isFavorite(symbol) ? favorites.value.filter((s) => s !== symbol) : [...favorites.value, symbol]
  favorites.value = next
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

type SortKey = 'name' | 'price' | 'change' | 'high' | 'low' | 'volume'
const sortKey = ref<SortKey>('volume')
const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
  activePreset.value = null
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ' ⇅'
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

type PresetKey = 'all' | 'gainers' | 'losers' | 'volume'
const sortPresets = computed(() => [
  { key: 'all' as PresetKey, label: t('전체', 'All') },
  { key: 'gainers' as PresetKey, label: t('상승률 상위', 'Top Gainers') },
  { key: 'losers' as PresetKey, label: t('하락률 상위', 'Top Losers') },
  { key: 'volume' as PresetKey, label: t('거래대금 상위', 'Top Volume') }
])
const activePreset = ref<PresetKey | null>('all')
function applyPreset(key: PresetKey) {
  activePreset.value = key
  if (key === 'all' || key === 'volume') {
    sortKey.value = 'volume'
    sortDir.value = 'desc'
  } else if (key === 'gainers') {
    sortKey.value = 'change'
    sortDir.value = 'desc'
  } else if (key === 'losers') {
    sortKey.value = 'change'
    sortDir.value = 'asc'
  }
  page.value = 1
}

const keyword = ref('')

const filtered = computed(() => {
  const all = overview.value?.items ?? []
  let list = all
  if (activeCategory.value === 'favorite') list = list.filter((i) => isFavorite(i.symbol))
  else if (activeCategory.value !== 'all') list = list.filter((i) => i.category === activeCategory.value)
  const q = keyword.value.toLowerCase()
  if (q) list = list.filter((i) => i.base.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))

  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name') return a.base.localeCompare(b.base) * dir
    if (sortKey.value === 'price') return (a.price - b.price) * dir
    if (sortKey.value === 'change') return (a.changePct - b.changePct) * dir
    if (sortKey.value === 'high') return ((a.high24h || 0) - (b.high24h || 0)) * dir
    if (sortKey.value === 'low') return ((a.low24h || 0) - (b.low24h || 0)) * dir
    return (a.volUsd - b.volUsd) * dir
  })
})

const page = ref(1)
const pageSize = 20
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})
watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})
function goPage(p: number) {
  page.value = Math.min(totalPages.value, Math.max(1, p))
}

// 1 2 3 4 5 6 ••• 8 형태의 페이지 번호
const pageItems = computed<Array<number | '…'>>(() => {
  const total = totalPages.value
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, 6, '…', total]
  if (cur >= total - 3) return [1, '…', ...Array.from({ length: 6 }, (_, i) => total - 5 + i)]
  return [1, '…', cur - 1, cur, cur + 1, '…', total]
})

// ── 현재 페이지 종목의 미니 차트 ──
const spark = ref<Record<string, number[]>>({})
async function loadSparks() {
  const need = pagedItems.value.map((i) => i.symbol).filter((s) => !(s in spark.value))
  if (!need.length) return
  try {
    const res = await $fetch<Record<string, number[]>>('/api/markets/sparklines', { query: { symbols: need.join(',') } })
    spark.value = { ...spark.value, ...res }
  } catch {
    // 미니 차트는 없어도 표는 보인다
  }
}
watch(
  pagedItems,
  () => {
    if (process.client) loadSparks()
  },
  { immediate: true }
)

function fmtUsdShort(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '$0'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`
  return `$${v.toFixed(2)}`
}
</script>
