<template>
  <div ref="root" class="relative inline-block">
    <slot :toggle="toggle" :open="open" />

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+8px)] z-50 w-[480px] max-w-[92vw] rounded-lg border border-[#2a2e39] bg-[#131722] pb-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    >
      <!-- 검색 -->
      <div class="p-3 pb-2">
        <div class="flex items-center gap-2 rounded-lg bg-[#1b1f2b] px-3 py-2.5 ring-1 ring-[#2a2e39] focus-within:ring-[#f0b90b]/60">
          <svg class="h-4 w-4 shrink-0 text-[#868993]" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" stroke-linecap="round" /></svg>
          <input
            ref="searchEl"
            v-model="query"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('검색', 'Search')"
            class="w-full bg-transparent text-[14px] text-[#d1d4dc] outline-none placeholder:text-[#868993]"
            @keydown.enter.prevent="selectFirst"
            @keydown.esc="open = false"
          />
        </div>
      </div>

      <!-- 큰 탭 -->
      <div class="flex items-center gap-5 border-b border-[#2a2e39] px-4">
        <button
          v-for="tb in tabs"
          :key="tb.id"
          type="button"
          class="relative py-2.5 text-[14px] transition"
          :class="tab === tb.id ? 'text-white' : 'text-[#868993] hover:text-[#d1d4dc]'"
          @click="setTab(tb.id)"
        >
          {{ tb.label }}
          <span v-if="tab === tb.id" class="absolute inset-x-0 bottom-0 h-[2px] bg-[#f0b90b]" />
        </button>
      </div>

      <!-- 분류 칩 -->
      <div v-if="chips.length" class="flex flex-wrap items-center gap-1 px-3 pb-1 pt-3">
        <button
          v-for="c in chips"
          :key="c.id"
          type="button"
          class="rounded-md px-2.5 py-1 text-[13px] transition"
          :class="chip === c.id ? 'bg-[#2a2e39] text-white' : 'text-[#868993] hover:text-[#d1d4dc]'"
          @click="chip = c.id"
        >
          {{ c.label }}
        </button>
      </div>

      <!-- 목록 머리글 -->
      <div class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-2 px-4 pb-1.5 pt-3 text-[13px] text-[#868993]">
        <div>{{ t('거래 종목', 'Trading Pairs') }}</div>
        <button type="button" class="flex items-center justify-end gap-1 hover:text-[#d1d4dc]" @click="setSort('price')">
          {{ t('가격', 'Price') }}<span class="text-[10px]">{{ sortMark('price') }}</span>
        </button>
        <button type="button" class="flex items-center justify-end gap-1 hover:text-[#d1d4dc]" @click="setSort('change')">
          {{ t('등락률', 'Change') }}<span class="text-[10px]">{{ sortMark('change') }}</span>
        </button>
      </div>

      <!-- 목록 -->
      <div class="max-h-[420px] overflow-y-auto overscroll-contain px-1.5">
        <div v-if="rows.length === 0" class="px-3 py-8 text-center text-[13px] text-[#868993]">{{ tab === 'fav' ? t('즐겨찾기한 종목이 없습니다.', 'No favorites yet.') : '—' }}</div>
        <div
          v-for="r in rows"
          :key="r.symbol"
          class="grid cursor-pointer grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-2 rounded-md px-2.5 py-2.5 text-[14px] hover:bg-white/5"
          :class="r.symbol === modelValue ? 'bg-white/[0.07]' : ''"
          @click="pick(r.symbol)"
        >
          <div class="flex min-w-0 items-center gap-2 text-[#d1d4dc]">
            <button
              type="button"
              class="shrink-0 text-[16px] leading-none"
              :class="favs.includes(r.symbol) ? 'text-[#f0b90b]' : 'text-[#868993] hover:text-white'"
              @click.stop="emit('toggleFav', r.symbol)"
            >
              {{ favs.includes(r.symbol) ? '★' : '☆' }}
            </button>
            <span class="truncate">{{ r.base }}/USDT</span>
          </div>
          <div class="text-right text-[#d1d4dc]">{{ fmtMarketPrice(r.price) }}</div>
          <div class="text-right" :class="r.changePct >= 0 ? 'text-[#22ab94]' : 'text-[#f23645]'">{{ fmtChange(r.changePct) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

// 차트 상단 종목 선택 패널: 검색 + 탭(즐겨찾기/현물/선물/TradFi) + 분류 칩 + 종목 표(가격, 등락률 정렬 가능)
const props = defineProps<{ modelValue: string; items: MarketItem[]; favs: string[] }>()
const emit = defineEmits<{
  (e: 'select', symbol: string): void
  (e: 'toggleFav', symbol: string): void
}>()
const { t } = useLocale()

type TabId = 'fav' | 'futures' | 'tradfi'
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const tab = ref<TabId>('futures')
const chip = ref('all')
const sortKey = ref<'' | 'price' | 'change'>('')
const sortDir = ref<1 | -1>(-1)

const tabs = computed(() => [
  { id: 'fav' as const, label: t('즐겨찾기', 'Favorites') },
  { id: 'futures' as const, label: t('선물', 'Futures') },
  { id: 'tradfi' as const, label: 'TradFi' }
])

const PLATFORM = new Set(['BNB', 'ETH', 'SOL', 'AVAX', 'TRX', 'ADA', 'DOT', 'NEAR', 'SUI', 'APT', 'ATOM', 'TON', 'MATIC', 'POL', 'FTM', 'ARB', 'OP'])
const MEME = new Set(['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'TURBO', 'BRETT', 'NEIRO', 'PNUT'])
const DEFI = new Set(['UNI', 'LINK', 'AAVE', 'MKR', 'CRV', 'SNX', 'COMP', 'SUSHI', 'LDO', 'DYDX', 'INJ'])
const NEW_DAYS = 90

const chips = computed(() => {
  if (tab.value === 'fav') return []
  if (tab.value === 'tradfi')
    return [
      { id: 'all', label: t('전체', 'All') },
      { id: 'stock', label: t('주식', 'Stocks') },
      { id: 'krStock', label: t('KR주식', 'KR Stocks') },
      { id: 'etf', label: 'ETF' },
      { id: 'commodity', label: t('원자재', 'Commodities') }
    ]
  return [
    { id: 'all', label: t('전체', 'All') },
    { id: 'new', label: t('신규', 'New') },
    { id: 'platform', label: t('플랫폼 코인', 'Platform Token') },
    { id: 'meme', label: 'MEME' },
    { id: 'defi', label: 'DeFi' }
  ]
})

function setTab(id: TabId) {
  tab.value = id
  chip.value = 'all'
}

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = (props.items || []).filter((i) => i && i.price > 0)
  if (tab.value === 'fav') list = list.filter((i) => props.favs.includes(i.symbol))
  else if (tab.value === 'tradfi') list = list.filter((i) => i.category !== 'coin')
  if (tab.value !== 'fav' && tab.value !== 'tradfi') {
    if (chip.value === 'new') list = list.filter((i) => i.listTime && Date.now() - Number(i.listTime) < NEW_DAYS * 86400_000)
    else if (chip.value === 'platform') list = list.filter((i) => PLATFORM.has(i.base))
    else if (chip.value === 'meme') list = list.filter((i) => MEME.has(i.base))
    else if (chip.value === 'defi') list = list.filter((i) => DEFI.has(i.base))
  } else if (tab.value === 'tradfi' && chip.value !== 'all') {
    list = list.filter((i) => i.category === chip.value)
  }
  if (q) list = list.filter((i) => i.base.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q) || String(i.name || '').toLowerCase().includes(q))
  if (sortKey.value) {
    const k = sortKey.value === 'price' ? 'price' : 'changePct'
    list = list.slice().sort((a: any, b: any) => (a[k] - b[k]) * sortDir.value)
  }
  return list
})

function setSort(k: 'price' | 'change') {
  if (sortKey.value === k) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = k
    sortDir.value = -1
  }
}
const sortMark = (k: 'price' | 'change') => (sortKey.value === k ? (sortDir.value === 1 ? '▲' : '▼') : '⇅')
const fmtChange = (v: number) => `${Number(v).toFixed(2)}%`

function toggle() {
  open.value = !open.value
}
watch(open, (v) => {
  if (!v) return
  query.value = ''
  nextTick(() => searchEl.value?.focus())
})
function pick(symbol: string) {
  emit('select', symbol)
  open.value = false
}
function selectFirst() {
  const first = rows.value[0]
  if (first) pick(first.symbol)
}

function onDocClick(e: MouseEvent) {
  const el = root.value
  if (!el || !open.value) return
  const target = e.target as Node | null
  if (target && el.contains(target)) return
  open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick, { capture: true }))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, { capture: true } as any))
</script>
