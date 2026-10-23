<template>
  <!-- 첫 화면 파트1 전체 배경 영상. 영상1이 끝나갈 때 페이드아웃되면서 영상2가 페이드인되고, 영상2가 끝나면 다시 영상1로 이어진다(무한 반복).
       위에 흰 필터(화이트 테마) / 어두운 필터(블랙 테마)를 덮어 글자가 잘 보이게 하고, 마우스에는 반응하지 않는다.
       필터 농도(heroWash, 0~100)는 Supabase에 저장된 값을 쓰고, 총관리자가 헤더의 조절 버튼으로 바꾼다. -->
  <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <video
      v-for="(src, i) in SOURCES"
      :key="src"
      :ref="(el) => setVideoEl(el, i)"
      class="hero-video absolute inset-0 h-full w-full object-cover"
      :style="{ opacity: active === i ? 1 : 0 }"
      :src="src"
      muted
      playsinline
      preload="auto"
      :autoplay="i === 0"
    />
    <div class="absolute inset-0 bg-[#020b16]" :style="{ opacity: heroWash / 100 }" />
    <!-- 아래쪽은 서서히 페이지 배경색으로 이어지게 -->
    <div class="hb-fade absolute inset-x-0 bottom-0 h-[22%]" />
  </div>
</template>

<script setup lang="ts">
// 영상을 바꾸면 v 값을 올린다(영상 파일은 브라우저에 오래 저장되므로 주소가 바뀌어야 새 영상을 받는다).
const SOURCES = ['/hero-bg.mp4?v=1', '/hero-bg-3.mp4?v=1']
const FADE_SEC = 1.2 // 끝나기 이 시간 전부터 다음 영상으로 크로스페이드

const videos: Array<HTMLVideoElement | null> = [null, null]
const active = ref(0)
function setVideoEl(el: any, i: number) {
  videos[i] = (el as HTMLVideoElement) || null
}

// 저장된 필터 농도(모든 방문자 공통)
const heroWash = useState<number>('hero_wash', () => 55)
const { data: washData } = await useFetch<{ percent: number }>('/api/settings/hero-wash', { key: 'hero-wash' })
if (washData.value && typeof washData.value.percent === 'number') heroWash.value = washData.value.percent

let timer: any = null
let switching = false

function play(v: HTMLVideoElement | null) {
  if (!v) return
  v.muted = true
  v.play().catch(() => {})
}

function switchTo(next: number) {
  const cur = active.value
  const nextEl = videos[next]
  if (!nextEl) return
  switching = true
  nextEl.currentTime = 0
  play(nextEl)
  active.value = next // CSS transition으로 이전 영상은 페이드아웃, 다음 영상은 페이드인
  // 페이드가 끝난 뒤 이전 영상은 멈추고 처음으로 되감아 둔다
  setTimeout(() => {
    const prev = videos[cur]
    if (prev) {
      prev.pause()
      prev.currentTime = 0
    }
    switching = false
  }, FADE_SEC * 1000 + 200)
}

onMounted(() => {
  play(videos[0])
  // 현재 영상이 끝나기 FADE_SEC 전에 다음 영상으로 넘어간다(영상1 → 영상2 → 영상1 …)
  timer = setInterval(() => {
    if (switching) return
    const v = videos[active.value]
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return
    if (v.paused && !v.ended) play(v)
    if (v.duration - v.currentTime <= FADE_SEC || v.ended) switchTo(active.value === 0 ? 1 : 0)
  }, 100)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.hero-video {
  transition: opacity 1.2s ease-in-out;
}
</style>
