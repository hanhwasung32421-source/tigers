<template>
  <img
    v-if="!failed"
    :src="src"
    :alt="base"
    :width="size"
    :height="size"
    loading="lazy"
    referrerpolicy="no-referrer"
    class="shrink-0 rounded-full bg-white/5 object-cover"
    :style="{ width: size + 'px', height: size + 'px' }"
    @error="failed = true"
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
// 코인 아이콘: OKX 공개 CDN의 심볼 아이콘을 쓴다(이 사이트의 시세/종목 기준이 OKX라 티커가 그대로 맞는다).
// 아이콘이 없는 종목(주식 등)이나 불러오기에 실패하면 티커 첫 글자 배지로 대신 보여준다.
const props = withDefaults(defineProps<{ base: string; size?: number }>(), { size: 32 })
const failed = ref(false)
const src = computed(() => `https://www.okx.com/cdn/oksupport/asset/currency/icon/${encodeURIComponent(props.base.toLowerCase())}.png`)
watch(
  () => props.base,
  () => {
    failed.value = false
  }
)
</script>
