<template>
  <div class="grid gap-3 sm:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">
    <!-- 왼쪽: 상승률 상위 코인 카드 -->
    <div class="space-y-3">
      <template v-if="cards.length">
        <NuxtLink
          v-for="c in cards"
          :key="c.symbol"
          :to="`/exchange/${c.symbol}`"
          class="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <CoinIcon :base="c.base" :size="32" />
              <span class="text-[15px] font-bold text-white">{{ c.category === 'coin' ? c.base : c.symbol }}</span>
            </div>
            <span class="text-[13px] font-bold" :class="c.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ sign(c.changePct) }}{{ c.changePct.toFixed(3) }}%</span>
          </div>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div class="font-mono text-[20px] font-bold text-white">{{ fmtMarketPrice(c.price) }}</div>
            <span class="flex items-center gap-1 text-[12px] font-semibold" :class="c.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ c.changePct >= 0 ? t('롱', 'Long') : t('숏', 'Short') }}
              <span class="flex items-end gap-[2px]" aria-hidden="true">
                <i v-for="n in 3" :key="n" class="block w-[3px] rounded-sm" :class="n <= strength(c.changePct) ? (c.changePct >= 0 ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-slate-600/60'" :style="{ height: 4 + n * 3 + 'px' }" />
              </span>
            </span>
          </div>
          <p class="mt-2 text-[12px] text-slate-400">24h {{ sign(c.changePct) }}{{ c.changePct.toFixed(1) }}%, {{ momentum(c.changePct) }}</p>
        </NuxtLink>
      </template>
      <template v-else>
        <div v-for="n in 3" :key="n" class="h-[112px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
      </template>
    </div>

    <!-- 오른쪽: 주식 선물 목록(미니 차트) -->
    <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-[17px] font-bold text-white">xStocks</h3>
        <NuxtLink to="/markets" class="text-[13px] text-slate-400 hover:text-white">{{ t('더보기', 'More') }} ›</NuxtLink>
      </div>
      <div class="mt-2 divide-y divide-white/5">
        <template v-if="stockRows.length">
          <NuxtLink
            v-for="r in stockRows"
            :key="r.symbol"
            :to="`/exchange/${r.symbol}`"
            class="flex items-center gap-3 py-3 transition hover:opacity-80"
          >
            <CoinIcon :base="r.base" :size="32" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[14px] font-bold text-white">{{ r.symbol }}</div>
              <div class="text-[12px] text-slate-400">{{ t('무기한', 'Perpetual') }}</div>
            </div>
            <MiniSparkline :values="spark[r.symbol] || []" :up="r.changePct >= 0" :width="76" :height="30" />
            <div class="w-[84px] shrink-0 text-right">
              <div class="font-mono text-[14px] font-bold text-white">{{ fmtMarketPrice(r.price) }}</div>
              <div class="text-[12px] font-semibold" :class="r.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ sign(r.changePct) }}{{ r.changePct.toFixed(2) }}%</div>
            </div>
          </NuxtLink>
        </template>
        <template v-else>
          <div v-for="n in 5" :key="n" class="my-3 h-9 animate-pulse rounded-lg bg-white/[0.05]" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

const { t } = useLocale()
const { items, refresh } = useMarketOverview()
const spark = ref<Record<string, number[]>>({})

const cards = computed(() => {
  // 맨 위는 SAMSUNGUSDT 고정, 나머지 두 자리는 거래대금이 어느 정도 되는 코인 중 상승률 상위(한산한 종목이 올라오지 않게)
  const samsung = items.value.find((i) => i.symbol === 'SAMSUNGUSDT')
  const coins = items.value.filter((i) => i.category === 'coin').sort((a, b) => b.volUsd - a.volUsd).slice(0, 60)
  const top = coins.sort((a, b) => b.changePct - a.changePct)
  return samsung ? [samsung, ...top.slice(0, 2)] : top.slice(0, 3)
})

// 대표 종목을 먼저 보여주고(시세 목록에 있는 것만), 남는 자리는 거래대금 순으로 채운다.
const FEATURED = ['SPCX', 'OPENAI', 'ARM', 'UNITREE', 'SKHYNIX']
const stockRows = computed(() => {
  const pool = items.value.filter((i) => i.category === 'krStock' || i.category === 'stock')
  const picked = FEATURED.map((b) => pool.find((i) => i.base === b)).filter((x): x is MarketItem => !!x)
  const rest = pool.filter((i) => !picked.includes(i)).sort((a, b) => b.volUsd - a.volUsd)
  return [...picked, ...rest].slice(0, 5)
})

function sign(n: number) {
  return n > 0 ? '+' : ''
}
function strength(c: number) {
  const a = Math.abs(c)
  return a >= 5 ? 3 : a >= 2 ? 2 : 1
}
function momentum(c: number) {
  if (c >= 5) return t('강한 상승 모멘텀!', 'strong bullish momentum!')
  if (c >= 2) return t('완만한 상승세', 'mild uptrend')
  if (c >= 0) return t('보합권 움직임', 'moving sideways')
  if (c > -2) return t('소폭 조정', 'slight pullback')
  return t('하락 압력', 'bearish pressure')
}

async function loadSparks() {
  const syms = stockRows.value.map((r) => r.symbol)
  if (!syms.length) return
  try {
    spark.value = await $fetch<Record<string, number[]>>('/api/markets/sparklines', { query: { symbols: syms.join(',') } })
  } catch {
    // 미니 차트는 없어도 목록은 보인다
  }
}

let timer: any = null
onMounted(async () => {
  await refresh(true)
  await loadSparks()
  timer = setInterval(async () => {
    await refresh(true)
    await loadSparks()
  }, 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
