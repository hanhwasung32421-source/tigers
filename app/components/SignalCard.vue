<template>
  <NuxtLink
    :to="`/exchange/${item.symbol}`"
    class="block w-[270px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <CoinIcon :base="item.base" :size="28" />
        <span class="text-[15px] font-bold text-white">{{ item.base }}</span>
      </div>
      <span class="text-[13px] font-bold" :class="up ? 'text-emerald-400' : 'text-rose-400'">{{ sign }}{{ item.changePct.toFixed(3) }}%</span>
    </div>
    <div class="mt-2 flex items-end justify-between gap-2">
      <div class="font-mono text-[20px] font-bold text-white">{{ fmtMarketPrice(item.price) }}</div>
      <span class="flex items-center gap-1 text-[12px] font-semibold" :class="up ? 'text-emerald-400' : 'text-rose-400'">
        {{ up ? t('롱', 'Long') : t('숏', 'Short') }}
        <span class="flex items-end gap-[2px]" aria-hidden="true">
          <i
            v-for="n in 3"
            :key="n"
            class="block w-[3px] rounded-sm"
            :class="n <= strength ? (up ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-slate-600/60'"
            :style="{ height: 4 + n * 3 + 'px' }"
          />
        </span>
      </span>
    </div>
    <p class="mt-2 truncate text-[12px] text-slate-400">24h {{ sign }}{{ item.changePct.toFixed(1) }}%, {{ momentum }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

const props = defineProps<{ item: MarketItem }>()
const { t } = useLocale()

const up = computed(() => props.item.changePct >= 0)
const sign = computed(() => (props.item.changePct > 0 ? '+' : ''))
const strength = computed(() => {
  const a = Math.abs(props.item.changePct)
  return a >= 5 ? 3 : a >= 2 ? 2 : 1
})
const momentum = computed(() => {
  const c = props.item.changePct
  if (c >= 5) return t('강한 상승 모멘텀!', 'strong bullish momentum!')
  if (c >= 2) return t('완만한 상승세', 'mild uptrend')
  if (c >= 0) return t('보합권 움직임', 'moving sideways')
  if (c > -2) return t('소폭 하락', 'mild downtrend')
  return t('강한 하락 압력', 'strong bearish pressure')
})
</script>
