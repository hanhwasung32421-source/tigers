<template>
  <div class="relative mx-auto aspect-square w-full max-w-[480px] select-none">
    <!-- 은은하게 회전하는 바깥 사각 테두리 -->
    <div class="square-orbit-frame absolute inset-0 rounded-[36px] border border-cyan-400/15" :class="{ 'is-paused': paused }" />
    <div class="square-orbit-frame-slow absolute inset-6 rounded-[30px] border border-white/5" :class="{ 'is-paused': paused }" />

    <!-- 본체 패널 -->
    <div class="absolute inset-3 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.10),transparent_45%),linear-gradient(160deg,#0a0f18,#05070c_60%)]">
      <div class="square-sheen absolute inset-0" :class="{ 'is-paused': paused }" />

      <div class="relative grid h-full w-full grid-cols-3 grid-rows-3 gap-3 p-6 sm:gap-4 sm:p-8">
        <div
          v-for="(tile, idx) in tiles"
          :key="idx"
          class="square-tile flex items-center justify-center rounded-2xl border"
          :class="[tile.center ? 'border-cyan-400/30 bg-cyan-400/[0.06]' : 'border-white/10 bg-white/[0.03]', { 'is-paused': paused }]"
          :style="{ animationDelay: `${idx * 0.35}s` }"
        >
          <div v-if="tile.center" class="flex flex-col items-center gap-1.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-base font-black text-cyan-200">
              {{ mark }}
            </div>
            <div class="text-[9px] font-semibold tracking-[0.2em] text-slate-400">{{ caption }}</div>
          </div>
          <svg v-else viewBox="0 0 24 24" class="h-6 w-6 text-slate-300/80 sm:h-7 sm:w-7" fill="none" stroke="currentColor" stroke-width="1.6">
            <path :d="tile.path" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 하단 상태바 -->
    <div class="absolute inset-x-6 bottom-0 flex translate-y-1/2 items-center justify-between rounded-full border border-white/10 bg-[#0a0f18] px-4 py-2 text-[11px] text-slate-400 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span class="tracking-wide">SYSTEM ONLINE</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-mono tracking-widest">24 / 7</span>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[10px] text-slate-300 hover:bg-white/10"
          :title="paused ? '움직임 재생' : '움직임 정지'"
          @click="paused = !paused"
        >
          {{ paused ? '▶' : '❚❚' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    mark?: string
    caption?: string
  }>(),
  { mark: 'U', caption: 'TRADE CORE' }
)

const paused = ref(false)

const ICONS = {
  chart: 'M4 19V5m5 14V9m5 10V7m5 12V11',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5',
  wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14 5h-3a1.5 1.5 0 0 0 0 3h3',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3m-14 0h16v9H4v-9z',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z'
} as const

const tiles = [
  { path: ICONS.grid },
  { path: ICONS.layers },
  { path: ICONS.chart },
  { path: ICONS.bolt },
  { center: true },
  { path: ICONS.wallet },
  { path: ICONS.shield },
  { path: ICONS.globe },
  { path: ICONS.lock }
] as const
</script>

<style scoped>
.square-orbit-frame {
  animation: square-spin 26s linear infinite;
}
.square-orbit-frame-slow {
  animation: square-spin-reverse 34s linear infinite;
}
.square-sheen {
  background: linear-gradient(115deg, transparent 40%, rgba(56, 189, 248, 0.08) 50%, transparent 60%);
  background-size: 220% 220%;
  animation: square-sheen-move 7s ease-in-out infinite;
}
.square-tile {
  animation: square-float 4.5s ease-in-out infinite;
}

.is-paused {
  animation-play-state: paused !important;
}

@keyframes square-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes square-spin-reverse {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}
@keyframes square-sheen-move {
  0%,
  100% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
}
@keyframes square-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .square-orbit-frame,
  .square-orbit-frame-slow,
  .square-sheen,
  .square-tile {
    animation: none !important;
  }
}
</style>
