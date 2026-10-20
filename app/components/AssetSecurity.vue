<template>
  <!-- 어두운 패널은 흰 테마에서도 그대로 어둡게 보이도록 색을 직접(style) 지정한다 -->
  <div class="mx-auto max-w-[1500px] overflow-hidden rounded-3xl" style="background: radial-gradient(120% 140% at 85% 40%, #1a1c22 0%, #0b0c0f 60%); color: #ffffff">
    <div class="grid items-center gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_320px] md:px-14 md:py-14">
      <div>
        <h2 class="text-[30px] font-bold leading-tight md:text-[40px]" style="color: #ffffff">{{ t('자산 보안을 위한 3가지 핵심 조치', '3 Key Measures for Asset Security') }}</h2>

        <ul class="mt-10 space-y-8">
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full" style="background: #8a8f98" />
            <div>
              <div class="text-[20px] font-bold" style="color: #ffffff">{{ t('1억 달러 가디언 펀드', '$100M Guardian Fund') }}</div>
              <div class="mt-2 text-[14px]" style="color: #c7cbd1">
                <span class="font-semibold" style="color: #ffffff">{{ t('지갑 주소', 'Wallet Address') }}</span>
                <a
                  :href="`https://etherscan.io/address/${WALLET}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-1 break-all underline decoration-dotted underline-offset-4 hover:opacity-80"
                  style="color: #aab4c8"
                >
                  {{ WALLET }}
                </a>
              </div>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full" style="background: #8a8f98" />
            <div>
              <div class="text-[20px] font-bold" style="color: #ffffff">{{ t('1:1 이상의 준비금 보유', 'Reserves Backed 1:1 and Beyond') }}</div>
              <div class="mt-2 text-[15px]" style="color: #9aa0a8">{{ t('실시간으로 검증되며 언제든 확인할 수 있습니다', 'Verified in real time and accessible at all times') }}</div>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full" style="background: #8a8f98" />
            <div>
              <div class="text-[20px] font-bold" style="color: #ffffff">{{ t('선물 보험 기금', 'Futures Insurance Fund') }}</div>
              <div class="mt-2 text-[15px]" style="color: #9aa0a8">{{ t('극단적인 시장 상황으로부터의 보호', 'Protection against market extremes') }}</div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 은빛 방패 -->
      <div class="mx-auto w-[230px] md:w-[300px]" aria-hidden="true">
        <svg viewBox="0 0 260 300" class="block h-auto w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]">
          <defs>
            <linearGradient id="sh-outer" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f6f7f9" />
              <stop offset="35%" stop-color="#b9bec6" />
              <stop offset="60%" stop-color="#8d939c" />
              <stop offset="100%" stop-color="#dfe2e6" />
            </linearGradient>
            <linearGradient id="sh-inner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e9ebee" />
              <stop offset="55%" stop-color="#a9aeb6" />
              <stop offset="100%" stop-color="#cfd3d8" />
            </linearGradient>
            <linearGradient id="sh-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
              <stop offset="45%" stop-color="#ffffff" stop-opacity="0" />
            </linearGradient>
            <radialGradient id="sh-emblem" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stop-color="#4a4e56" />
              <stop offset="100%" stop-color="#1c1e23" />
            </radialGradient>
          </defs>
          <!-- 바깥 테두리 -->
          <path d="M130 8 L238 40 V138 C238 212 190 266 130 292 C70 266 22 212 22 138 V40 Z" fill="url(#sh-outer)" />
          <!-- 안쪽 면 -->
          <path d="M130 24 L224 52 V138 C224 204 182 252 130 276 C78 252 36 204 36 138 V52 Z" fill="url(#sh-inner)" />
          <!-- 빛 반사 -->
          <path d="M130 24 L224 52 V138 C224 204 182 252 130 276 C78 252 36 204 36 138 V52 Z" fill="url(#sh-shine)" />
          <!-- 안쪽 오목한 판 -->
          <path d="M130 52 L202 74 V138 C202 190 170 228 130 246 C90 228 58 190 58 138 V74 Z" fill="url(#sh-emblem)" stroke="#d5d8dd" stroke-width="2" />
          <!-- 엠블럼(사이트 K 마크) -->
          <image href="/favicon.png" x="90" y="100" width="80" height="80" />
          <!-- 상단 하이라이트 선 -->
          <path d="M130 12 L234 42" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2" fill="none" stroke-linecap="round" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const WALLET = '0x469AfE803C54A36674C55231489Cf4b61da8c1bC'
</script>
