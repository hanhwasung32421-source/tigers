<template>
  <section>
    <h2 class="text-[15px] font-medium text-white">AI Trading Signal Radar</h2>
    <div class="radar-mask mt-3 overflow-hidden" @mouseenter="paused = true" @mouseleave="paused = false">
      <div v-if="loop.length" class="radar-track" :style="{ transform: `translateX(-${idx * STEP}px)`, transition: anim ? 'transform 600ms ease-in-out' : 'none' }">
        <div v-for="(c, i) in loop" :key="`${c.symbol}-${i}`" class="mr-4 shrink-0">
          <SignalCard :item="c" />
        </div>
      </div>
      <div v-else class="flex">
        <div v-for="n in 6" :key="n" class="mr-4 h-[112px] w-[270px] shrink-0 animate-pulse rounded-2xl border border-white/10 bg-[#0c1522]" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MarketItem } from '../composables/useMarketOverview'

// 마켓 화면의 AI Trading Signal Radar와 같은 동작: 2초마다 카드 한 장씩 왼쪽으로 밀리고, 양끝은 서서히 사라진다.
const { items, refresh } = useMarketOverview()

const radarItems = computed<MarketItem[]>(() => {
  const coins = items.value.filter((i) => i.category === 'coin' && i.price > 0).sort((a, b) => b.volUsd - a.volUsd).slice(0, 80)
  return coins.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 14)
})
// 끊김 없이 이어지도록 같은 목록을 두 번 이어 붙이고, 한 바퀴(원래 목록 길이)를 돌면 애니메이션 없이 처음으로 되돌린다.
const loop = computed(() => [...radarItems.value, ...radarItems.value])

const STEP = 286 // 카드 270px + 간격 16px
const idx = ref(0)
const anim = ref(true)
const paused = ref(false)
let timer: any = null
let resetTimer: any = null

onMounted(() => {
  refresh().catch(() => {})
  timer = setInterval(() => {
    const n = radarItems.value.length
    if (paused.value || n < 2) return
    anim.value = true
    idx.value++
    if (idx.value >= n) {
      resetTimer = setTimeout(() => {
        anim.value = false
        idx.value = 0
      }, 700)
    }
  }, 2000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (resetTimer) clearTimeout(resetTimer)
})
</script>
