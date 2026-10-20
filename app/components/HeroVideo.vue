<template>
  <!-- 첫 화면 파트1 전체 배경 영상. 위에 흰 필터(화이트 테마) / 어두운 필터(블랙 테마)를 덮어 글자가 잘 보이게 하고, 마우스에는 반응하지 않는다.
       필터 농도(heroWash, 0~100)는 Supabase에 저장된 값을 쓰고, 총관리자가 헤더의 조절 버튼으로 바꾼다. -->
  <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <video ref="videoEl" class="absolute inset-0 h-full w-full object-cover" src="/hero-bg.mp4" autoplay muted loop playsinline preload="auto" />
    <div class="absolute inset-0 bg-[#020b16]" :style="{ opacity: heroWash / 100 }" />
    <!-- 아래쪽은 서서히 페이지 배경색으로 이어지게 -->
    <div class="hb-fade absolute inset-x-0 bottom-0 h-[22%]" />
  </div>
</template>

<script setup lang="ts">
const videoEl = ref<HTMLVideoElement | null>(null)

// 저장된 필터 농도(모든 방문자 공통)
const heroWash = useState<number>('hero_wash', () => 55)
const { data: washData } = await useFetch<{ percent: number }>('/api/settings/hero-wash', { key: 'hero-wash' })
if (washData.value && typeof washData.value.percent === 'number') heroWash.value = washData.value.percent

// 자동 재생(소리 없음)이 막힌 환경에서도 한 번 더 재생을 시도한다.
onMounted(() => {
  const v = videoEl.value
  if (!v) return
  v.muted = true
  v.play().catch(() => {})
})
</script>
