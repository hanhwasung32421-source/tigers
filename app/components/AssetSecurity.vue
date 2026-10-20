<template>
  <!-- 화이트 테마: 흰 배경 + 검은 글씨 / 블랙 테마: 검은 배경 + 흰 글씨. (색은 사이트 공통 테마 규칙을 따른다) -->
  <div class="mx-auto max-w-[1500px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c0f]">
    <div class="grid items-center gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_320px] md:px-14 md:py-14">
      <div>
        <h2 class="text-[30px] font-bold leading-tight text-white md:text-[40px]">{{ t('자산 보안을 위한 3가지 핵심 조치', '3 Key Measures for Asset Security') }}</h2>

        <ul class="mt-10 space-y-8">
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <div>
              <div class="text-[20px] font-bold text-white">{{ t('1억 달러 가디언 펀드', '$100M Guardian Fund') }}</div>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <div>
              <div class="text-[20px] font-bold text-white">{{ t('1:1 이상의 준비금 보유', 'Reserves Backed 1:1 and Beyond') }}</div>
              <div class="mt-2 text-[15px] text-slate-400">{{ t('실시간으로 검증되며 언제든 확인할 수 있습니다', 'Verified in real time and accessible at all times') }}</div>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <div>
              <div class="text-[20px] font-bold text-white">{{ t('선물 보험 기금', 'Futures Insurance Fund') }}</div>
              <div class="mt-2 text-[15px] text-slate-400">{{ t('극단적인 시장 상황으로부터의 보호', 'Protection against market extremes') }}</div>
            </div>
          </li>
        </ul>

        <NuxtLink
          to="/auth/register"
          class="mt-12 inline-flex items-center justify-center rounded-full px-10 py-4 text-[18px] font-bold transition hover:opacity-90"
          style="background-color: #f0b90b; color: #000000"
        >
          {{ t('KTX 시작하기', 'Get Started with KTX') }}
        </NuxtLink>
      </div>

      <!-- 픽셀 방패: 로고(KTX)처럼 노란 네모 블록으로 만든다 -->
      <div class="mx-auto w-[220px] md:w-[280px]" aria-hidden="true">
        <svg :viewBox="`0 0 ${COLS * CELL} ${ROWS.length * CELL}`" class="block h-auto w-full">
          <rect v-for="(c, i) in cells" :key="i" :x="c.x" :y="c.y" :width="CELL - GAP" :height="CELL - GAP" rx="2" :fill="c.mark ? '#0b0c0f' : '#f0b90b'" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()

// 방패 도트(15x17). '#'=노란 블록, '.'=비움. MARK는 방패 안에 새기는 체크 표시(어두운 블록).
const ROWS = [
  '.#############.',
  '###############',
  '###############',
  '###############',
  '###############',
  '###############',
  '###############',
  '###############',
  '###############',
  '.#############.',
  '.#############.',
  '..###########..',
  '...#########...',
  '....#######....',
  '.....#####.....',
  '......###......',
  '.......#.......'
]
const MARK = new Set(['6,4', '7,5', '8,6', '7,7', '6,8', '5,9', '4,10'])
const COLS = 15
const CELL = 18
const GAP = 3
const cells = ROWS.flatMap((row, r) =>
  row.split('').flatMap((ch, c) => (ch === '#' ? [{ x: c * CELL, y: r * CELL, mark: MARK.has(`${r},${c}`) }] : []))
)
</script>
