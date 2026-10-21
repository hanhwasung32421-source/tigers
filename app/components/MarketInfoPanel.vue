<template>
  <div class="px-4 py-3 text-[#d1d4dc]">
    <div class="flex items-center gap-3">
      <CoinIcon :base="base" :size="30" />
      <div class="text-[20px] font-bold text-white">{{ base }}</div>
      <div class="text-[15px] text-[#868993]">{{ fullName }}</div>
    </div>

    <div class="mt-4 grid gap-x-10 gap-y-0 lg:grid-cols-2">
      <div>
        <div v-for="row in leftRows" :key="row.label" class="flex items-center justify-between py-[14px] text-[14px]">
          <span class="text-[#868993]">{{ row.label }}</span>
          <span class="font-medium text-white">{{ row.value }}</span>
        </div>
      </div>
      <div>
        <div v-for="row in rightRows" :key="row.label" class="flex items-center justify-between py-[14px] text-[14px]">
          <span class="text-[#868993]">{{ row.label }}</span>
          <span class="font-medium text-white">{{ row.value }}</span>
        </div>

        <div class="my-2 border-t border-dashed border-[#2a2e39]" />
        <div class="mt-4 text-[18px] font-semibold text-white">{{ t('링크', 'Links') }}</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <a v-if="info?.homepage" :href="info.homepage" target="_blank" rel="noopener noreferrer" class="rounded-md bg-[#1e222d] px-4 py-2 text-[14px] text-white hover:bg-[#2a2e39]">🔗 {{ t('공식 웹사이트', 'Official Website') }}</a>
          <a v-if="info?.whitepaper" :href="info.whitepaper" target="_blank" rel="noopener noreferrer" class="rounded-md bg-[#1e222d] px-4 py-2 text-[14px] text-white hover:bg-[#2a2e39]">📄 {{ t('백서', 'Whitepaper') }}</a>
          <a v-if="info?.explorer" :href="info.explorer" target="_blank" rel="noopener noreferrer" class="rounded-md bg-[#1e222d] px-4 py-2 text-[14px] text-white hover:bg-[#2a2e39]">🔍 {{ t('블록체인 탐색기', 'Blockchain Explorer') }}</a>
          <span v-if="!info?.homepage && !info?.whitepaper && !info?.explorer" class="text-[13px] text-[#868993]">—</span>
        </div>
        <div class="mt-5 text-[18px] font-semibold text-white">{{ t('소개', 'Overview') }}</div>
        <p class="mt-2 text-[14px] leading-6 text-[#868993]">{{ info?.description || '—' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

// 차트 화면 "Information" 탭: 종목 기본 정보. 시세/거래량은 마켓 시세(overview)에서, 시가총액·공급량·역대 최고/최저가·링크·소개는 서버(/api/markets/info)에서 받는다.
const props = defineProps<{ symbol: string; item: MarketItem | null }>()
const { t } = useLocale()

type Info = {
  found: boolean
  name?: string
  price?: number | null
  fdv?: number | null
  marketCap?: number | null
  circulatingSupply?: number | null
  totalSupply?: number | null
  maxSupply?: number | null
  ath?: number | null
  atl?: number | null
  genesisDate?: string | null
  homepage?: string | null
  whitepaper?: string | null
  explorer?: string | null
  description?: string | null
}
const info = ref<Info | null>(null)
const base = computed(() => String(props.symbol || '').toUpperCase().replace(/USDT$/, ''))
const fullName = computed(() => info.value?.name || props.item?.name || '')

async function load() {
  info.value = null
  try {
    info.value = await $fetch<Info>('/api/markets/info', { query: { symbol: props.symbol } })
  } catch {
    info.value = { found: false }
  }
}
onMounted(load)
watch(() => props.symbol, load)

function compact(n: number | null | undefined) {
  const v = Number(n)
  if (!Number.isFinite(v) || n === null || n === undefined) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return Math.round(v).toLocaleString('en-US')
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
const usdt = (n: number | null | undefined) => (Number.isFinite(Number(n)) && n !== null && n !== undefined ? `${compact(n)} USDT` : '—')
const coin = (n: number | null | undefined) => (Number.isFinite(Number(n)) && n !== null && n !== undefined ? `${Math.round(Number(n)).toLocaleString('en-US')} ${base.value}` : '—')
const price = (n: number | null | undefined) => (Number.isFinite(Number(n)) && n !== null && n !== undefined ? `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 8 })} USDT` : '—')

const volUsd = computed(() => (props.item?.volUsd ? Number(props.item.volUsd) : null))
const volBase = computed(() => (props.item && props.item.price > 0 && props.item.volUsd ? Number(props.item.volUsd) / Number(props.item.price) : null))
const totalMcap = computed(() => info.value?.fdv ?? null)

const leftRows = computed(() => [
  { label: t('총 시가총액', 'Total Market Cap'), value: usdt(totalMcap.value) },
  { label: t('24시간 거래량', '24H Volume'), value: volBase.value ? `${compact(volBase.value)} ${base.value}` : '—' },
  { label: t('24시간 거래대금', '24H Vol'), value: usdt(volUsd.value) },
  { label: t('최대 공급량', 'Max Supply'), value: coin(info.value?.maxSupply) },
  { label: t('현재 유통 공급량', 'Current Circulating Supply'), value: coin(info.value?.circulatingSupply) },
  { label: t('출시일', 'Launch Date'), value: info.value?.genesisDate || '—' },
  { label: t('역대 최고가 (ATH)', 'All-Time High (ATH)'), value: price(info.value?.ath) },
  { label: t('역대 최저가 (ATL)', 'All-Time Low (ATL)'), value: price(info.value?.atl) }
])
const rightRows = computed(() => [
  { label: t('유통 시가총액', 'Circulating MCAP'), value: usdt(info.value?.marketCap) },
  { label: t('총 공급량', 'Total Supply'), value: coin(info.value?.totalSupply) },
  { label: t('시가총액 / 유통 시가총액', 'Market Cap/Circulating MCAP'), value: info.value?.marketCap || totalMcap.value ? `${usdt(totalMcap.value)} / ${usdt(info.value?.marketCap)}` : '—' },
  { label: t('완전 희석 가치 (FDV)', 'FDV (Fully Diluted Valuation)'), value: usdt(info.value?.fdv) }
])
</script>
