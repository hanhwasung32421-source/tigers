<template>
  <div class="mx-auto max-w-[1500px]">
    <div class="text-center">
      <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">MARKETS</div>
      <h2 class="mt-4 text-[34px] font-black leading-tight text-white md:text-[43.2px]">{{ t('인기 종목', 'Popular Instruments') }}</h2>
      <p class="mt-3 text-[16.8px] text-slate-400">{{ t('300개 이상의 종목을 바로 거래하세요', 'Trade 300+ instruments instantly') }}</p>
    </div>

    <div class="mt-10 grid gap-6 lg:grid-cols-2">
      <section v-for="panel in panels" :key="panel.key" class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="tab in panel.tabs"
              :key="tab.key"
              type="button"
              class="rounded-full border px-4 py-2 text-[14px] font-semibold transition"
              :class="panel.active.value === tab.key ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-white/10 text-slate-400 hover:text-white'"
              @click="panel.active.value = tab.key"
            >
              {{ t(tab.ko, tab.en) }}
            </button>
          </div>
          <NuxtLink to="/markets" class="text-[14px] text-slate-300 hover:text-white">{{ t('더보기', 'More') }} ›</NuxtLink>
        </div>

        <div class="mt-5 overflow-x-auto">
          <table class="w-full min-w-[420px] text-[14px]">
            <thead class="text-slate-500">
              <tr class="text-left">
                <th class="py-2 pr-2 font-medium">{{ t('거래쌍', 'Trading Pair') }}</th>
                <th class="px-2 py-2 font-medium">{{ t('가격 / 등락', 'Price / Change') }}</th>
                <th class="px-2 py-2 text-right font-medium">{{ t('24시간 거래대금', '24H Vol') }}</th>
                <th class="py-2 pl-2 text-right font-medium">{{ t('거래', 'Action') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="rows(panel).length">
                <tr v-for="r in rows(panel)" :key="r.symbol" class="border-t border-white/5">
                  <td class="py-3.5 pr-2">
                    <NuxtLink :to="`/exchange/${r.symbol}`" class="flex items-center gap-3 hover:opacity-80">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white" :style="{ background: marketBadgeColor(r.base) }">{{ r.base.charAt(0) }}</span>
                      <span class="font-bold text-white">{{ r.base }} <span class="font-normal text-slate-500">/USDT</span></span>
                    </NuxtLink>
                  </td>
                  <td class="px-2 py-3.5">
                    <div class="font-mono font-semibold text-white">{{ fmtMarketPrice(r.price) }}</div>
                    <div class="text-[12.5px]" :class="r.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ r.changePct > 0 ? '+' : '' }}{{ r.changePct.toFixed(2) }}%</div>
                  </td>
                  <td class="px-2 py-3.5 text-right font-mono text-slate-200">{{ fmtMarketVolume(r.volUsd) }}</td>
                  <td class="py-3.5 pl-2 text-right">
                    <NuxtLink :to="`/exchange/${r.symbol}`" class="inline-block rounded-md bg-white/10 px-4 py-2 text-[13px] font-semibold text-slate-100 hover:bg-white/20">
                      {{ t('거래', 'Trade') }}
                    </NuxtLink>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="n in 6" :key="n" class="border-t border-white/5">
                  <td colspan="4" class="py-3"><div class="h-8 animate-pulse rounded-lg bg-white/[0.05]" /></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="mt-8 text-center">
      <NuxtLink to="/markets" class="text-[16px] font-semibold text-slate-200 hover:text-white">{{ t('전체 보기', 'View More') }} ›</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

const { t } = useLocale()
const { items, refresh } = useMarketOverview()

const leftTab = ref('coin')
const rightTab = ref('hot')

const panels = [
  {
    key: 'left',
    active: leftTab,
    tabs: [
      { key: 'coin', ko: '코인', en: 'Coins' },
      { key: 'stock', ko: '해외주식', en: 'Global Stocks' },
      { key: 'kr', ko: '국내주식', en: 'KR Stocks' }
    ]
  },
  {
    key: 'right',
    active: rightTab,
    tabs: [
      { key: 'hot', ko: '거래대금 상위', en: 'Top Volume' },
      { key: 'gain', ko: '상승', en: 'Gainers' },
      { key: 'lose', ko: '하락', en: 'Losers' }
    ]
  }
]

const ROWS = 6
function rows(panel: (typeof panels)[number]): MarketItem[] {
  const all = items.value
  const k = panel.active.value
  let list: MarketItem[] = []
  if (panel.key === 'left') {
    const cat = k === 'coin' ? ['coin'] : k === 'kr' ? ['krStock'] : ['stock', 'etf', 'commodity']
    list = all.filter((i) => cat.includes(i.category)).sort((a, b) => b.volUsd - a.volUsd)
  } else if (k === 'gain') {
    list = [...all].filter((i) => i.volUsd > 0).sort((a, b) => b.changePct - a.changePct)
  } else if (k === 'lose') {
    list = [...all].filter((i) => i.volUsd > 0).sort((a, b) => a.changePct - b.changePct)
  } else {
    list = [...all].sort((a, b) => b.volUsd - a.volUsd)
  }
  return list.slice(0, ROWS)
}

onMounted(() => {
  refresh().catch(() => {})
})
</script>
