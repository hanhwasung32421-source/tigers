<template>
  <img
    v-if="src"
    :key="src"
    :src="src"
    :alt="base"
    :width="size"
    :height="size"
    loading="lazy"
    referrerpolicy="no-referrer"
    class="shrink-0 rounded-full bg-white/5 object-cover"
    :style="{ width: size + 'px', height: size + 'px' }"
    @error="idx++"
  />
  <span
    v-else
    class="flex shrink-0 items-center justify-center rounded-full font-black text-white"
    :style="{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.45) + 'px', background: marketBadgeColor(base) }"
  >
    {{ base.charAt(0) }}
  </span>
</template>

<script setup lang="ts">
// 코인/종목 아이콘: 여러 공개 이미지 출처를 순서대로 시도한다(앞 출처에 없으면 다음 출처).
//  1) OKX 심볼 아이콘(이 사이트 시세 기준이라 티커가 그대로 맞고, 주식 종목 아이콘도 있다)
//  2) CoinCap 아이콘  3) cryptocurrency-icons(컬러 SVG)  4) CoinGecko 검색(서버 경유 없이 불가) 대신 마지막은 첫 글자 배지
const props = withDefaults(defineProps<{ base: string; size?: number }>(), { size: 32 })
const idx = ref(0)
const sources = computed(() => {
  const b = props.base.toLowerCase()
  const e = encodeURIComponent(b)
  return [
    `https://www.okx.com/cdn/oksupport/asset/currency/icon/${e}.png`,
    `https://static.coinall.ltd/cdn/oksupport/asset/currency/icon/${e}.png`,
    `https://assets.coincap.io/assets/icons/${e}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${e}.svg`
  ]
})
const src = computed(() => sources.value[idx.value] || '')
watch(
  () => props.base,
  () => {
    idx.value = 0
  }
)
</script>
