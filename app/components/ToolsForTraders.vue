<template>
  <div class="mx-auto max-w-[1500px]">
    <div class="text-center">
      <h2 class="text-[34px] font-black leading-tight text-white md:text-[44px]">{{ t('트레이더를 위한 도구', 'Tools for Traders') }}</h2>
      <p class="mt-3 text-[16px] text-slate-400">{{ t('트레이딩을 단순하게, 트레이더에게 힘을', 'Trading Simplified To Empower Traders') }}</p>
    </div>

    <div class="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="card in cards"
        :key="card.key"
        :to="card.to"
        class="tool-card flex flex-col items-center rounded-3xl bg-white/[0.04] px-6 pb-9 pt-10 text-center transition hover:bg-white/[0.07]"
      >
        <!-- 하이퍼리얼 느낌의 금속/유리 질감 일러스트(SVG 그라디언트). 카드에 마우스를 올리면 안의 그래픽이 움직이고, 떼면 제자리로 돌아간다 -->
        <svg viewBox="0 0 180 130" class="h-[122px] w-[170px] overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient :id="`${card.key}-gold`" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff6c8" />
              <stop offset="30%" stop-color="#f6c744" />
              <stop offset="65%" stop-color="#b9820f" />
              <stop offset="100%" stop-color="#ffe08a" />
            </linearGradient>
            <linearGradient :id="`${card.key}-gold2`" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#8a5a06" />
              <stop offset="45%" stop-color="#e9b73a" />
              <stop offset="100%" stop-color="#fff0ae" />
            </linearGradient>
            <linearGradient :id="`${card.key}-silver`" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fbfcfd" />
              <stop offset="35%" stop-color="#c3c8cf" />
              <stop offset="65%" stop-color="#858b94" />
              <stop offset="100%" stop-color="#e8ebef" />
            </linearGradient>
            <linearGradient :id="`${card.key}-glass`" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
              <stop offset="50%" stop-color="#d7dde5" stop-opacity="0.55" />
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9" />
            </linearGradient>
            <radialGradient :id="`${card.key}-shine`" cx="35%" cy="28%" r="70%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
            </radialGradient>
            <filter :id="`${card.key}-shadow`" x="-30%" y="-30%" width="170%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.28" />
            </filter>
          </defs>

          <!-- 1) 통합 계정: 은빛 지갑 + 금화 -->
          <g v-if="card.key === 'account'" :filter="`url(#${card.key}-shadow)`">
            <g class="tg t-coin-a">
              <ellipse cx="62" cy="40" rx="26" ry="26" :fill="`url(#${card.key}-gold)`" stroke="#a9760a" stroke-width="1.5" />
              <ellipse cx="62" cy="40" rx="19" ry="19" fill="none" stroke="#fff3b8" stroke-opacity="0.8" stroke-width="2" />
              <rect x="58" y="28" width="8" height="24" rx="2" fill="#b8860b" fill-opacity="0.7" />
              <ellipse cx="55" cy="31" rx="9" ry="6" :fill="`url(#${card.key}-shine)`" />
            </g>
            <g class="tg t-coin-b">
              <ellipse cx="112" cy="46" rx="22" ry="22" :fill="`url(#${card.key}-gold2)`" stroke="#9a6a08" stroke-width="1.5" />
              <ellipse cx="112" cy="46" rx="15" ry="15" fill="none" stroke="#ffeaa0" stroke-opacity="0.7" stroke-width="2" />
              <rect x="108.5" y="36" width="7" height="20" rx="2" fill="#a06f0a" fill-opacity="0.6" />
            </g>
            <g class="tg t-wallet">
              <rect x="24" y="52" width="122" height="64" rx="16" :fill="`url(#${card.key}-silver)`" stroke="#7a8089" stroke-width="1.2" />
              <path d="M24 70 Q85 56 146 70" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="2.5" />
              <rect x="112" y="72" width="44" height="30" rx="12" :fill="`url(#${card.key}-silver)`" stroke="#6d737c" stroke-width="1.2" />
              <g class="tg t-clasp">
                <circle cx="128" cy="87" r="8" :fill="`url(#${card.key}-gold)`" stroke="#9a6a08" stroke-width="1.2" />
                <ellipse cx="126" cy="84" rx="3.5" ry="2.5" fill="#ffffff" fill-opacity="0.8" />
              </g>
            </g>
          </g>

          <!-- 2) 미니 계약: 유리/금 캔들 -->
          <g v-else-if="card.key === 'mini'" :filter="`url(#${card.key}-shadow)`">
            <g class="tg t-c1">
              <line x1="36" y1="34" x2="36" y2="104" stroke="#9aa0a8" stroke-width="2.5" />
              <rect x="26" y="52" width="20" height="34" rx="3" :fill="`url(#${card.key}-silver)`" stroke="#7a8089" />
            </g>
            <g class="tg t-c2">
              <line x1="76" y1="20" x2="76" y2="110" stroke="#b9820f" stroke-width="2.5" />
              <rect x="64" y="36" width="24" height="50" rx="3" :fill="`url(#${card.key}-gold)`" stroke="#9a6a08" />
            </g>
            <g class="tg t-c3">
              <line x1="106" y1="40" x2="106" y2="118" stroke="#9aa0a8" stroke-width="2.5" />
              <rect x="96" y="60" width="20" height="38" rx="3" :fill="`url(#${card.key}-glass)`" stroke="#aab2bc" />
              <rect x="98" y="62" width="6" height="30" rx="2" fill="#ffffff" fill-opacity="0.7" />
            </g>
            <g class="tg t-c4">
              <line x1="140" y1="14" x2="140" y2="98" stroke="#b9820f" stroke-width="2.5" />
              <rect x="128" y="26" width="24" height="52" rx="3" :fill="`url(#${card.key}-gold2)`" stroke="#9a6a08" />
            </g>
            <g class="tg t-mcoin">
              <circle cx="82" cy="30" r="22" :fill="`url(#${card.key}-gold)`" stroke="#a9760a" stroke-width="1.5" />
              <circle cx="82" cy="30" r="15" fill="none" stroke="#fff3b8" stroke-opacity="0.8" stroke-width="2" />
              <path d="M82 20v20M76 24h9a4 4 0 0 1 0 8h-8" fill="none" stroke="#8f6209" stroke-width="2.2" stroke-linecap="round" />
              <ellipse cx="74" cy="21" rx="8" ry="5" :fill="`url(#${card.key}-shine)`" />
            </g>
          </g>

          <!-- 3) 옵션 그리드: 금속 패널 + 빨강/초록 차트 + YES/NO -->
          <g v-else-if="card.key === 'grid'" :filter="`url(#${card.key}-shadow)`">
            <g class="tg t-panel">
              <rect x="22" y="22" width="120" height="96" rx="12" :fill="`url(#${card.key}-silver)`" stroke="#7a8089" stroke-width="1.5" />
              <rect x="30" y="30" width="104" height="80" rx="7" fill="#d9dde2" stroke="#9aa0a8" />
              <g stroke="#ffffff" stroke-opacity="0.8" stroke-width="1">
                <line x1="30" y1="50" x2="134" y2="50" /><line x1="30" y1="70" x2="134" y2="70" /><line x1="30" y1="90" x2="134" y2="90" />
                <line x1="56" y1="30" x2="56" y2="110" /><line x1="82" y1="30" x2="82" y2="110" /><line x1="108" y1="30" x2="108" y2="110" />
              </g>
              <g class="tg t-gline">
                <polyline points="36,88 52,70 66,84 82,60 96,78 112,48 126,40" fill="none" stroke="#1d9a3a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="36,88 52,70 66,84 82,60 96,78 112,48 126,40" fill="none" stroke="#7ee08f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M118 34l14 4-8 10z" fill="#1d9a3a" />
              </g>
              <g class="tg t-rline">
                <polyline points="36,50 52,64 66,52 82,80 96,66 112,96 126,92" fill="none" stroke="#b8161e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="36,50 52,64 66,52 82,80 96,66 112,96 126,92" fill="none" stroke="#ff8a8f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </g>
            </g>
            <g class="tg t-yes">
              <rect x="128" y="30" width="38" height="22" rx="7" fill="#169a37" stroke="#0d6b24" stroke-width="1.5" />
              <text x="147" y="46" text-anchor="middle" font-size="12" font-weight="800" fill="#eafff0" font-family="Inter, Arial, sans-serif">YES</text>
            </g>
            <g class="tg t-no">
              <rect x="128" y="80" width="38" height="24" rx="7" fill="#c7151d" stroke="#8c0d13" stroke-width="1.5" />
              <text x="147" y="97" text-anchor="middle" font-size="12" font-weight="800" fill="#ffecee" font-family="Inter, Arial, sans-serif">NO</text>
            </g>
          </g>

          <!-- 4) 보석 매수: 금화(시바견) + 작은 은화들 -->
          <g v-else :filter="`url(#${card.key}-shadow)`">
            <g class="tg t-gcoin">
              <circle cx="96" cy="66" r="46" :fill="`url(#${card.key}-gold)`" stroke="#9a6a08" stroke-width="2" />
              <circle cx="96" cy="66" r="38" fill="none" stroke="#fff0a8" stroke-opacity="0.85" stroke-width="2.5" />
              <path d="M68 40l8 14-16 2z M124 40l-8 14 16 2z" fill="#d98a2b" stroke="#8f560f" stroke-width="1.2" />
              <ellipse cx="96" cy="70" rx="27" ry="25" fill="#e8963a" stroke="#8f560f" stroke-width="1.2" />
              <ellipse cx="96" cy="78" rx="17" ry="14" fill="#fbe9c6" />
              <ellipse cx="86" cy="64" rx="3.6" ry="4.4" fill="#2b1a0d" /><ellipse cx="106" cy="64" rx="3.6" ry="4.4" fill="#2b1a0d" />
              <ellipse cx="85" cy="62.5" rx="1.2" ry="1.4" fill="#ffffff" /><ellipse cx="105" cy="62.5" rx="1.2" ry="1.4" fill="#ffffff" />
              <ellipse cx="96" cy="76" rx="5" ry="3.6" fill="#2b1a0d" />
              <path d="M96 79v6M90 86q6 5 12 0" fill="none" stroke="#2b1a0d" stroke-width="1.8" stroke-linecap="round" />
              <ellipse cx="76" cy="46" rx="14" ry="8" :fill="`url(#${card.key}-shine)`" />
            </g>
            <g class="tg t-pepe">
              <circle cx="40" cy="36" r="22" :fill="`url(#${card.key}-silver)`" stroke="#6d737c" stroke-width="1.5" />
              <circle cx="40" cy="38" r="15" fill="#5fae4a" stroke="#2f6b25" stroke-width="1.2" />
              <circle cx="33" cy="31" r="5.5" fill="#ffffff" stroke="#2f6b25" /><circle cx="47" cy="31" r="5.5" fill="#ffffff" stroke="#2f6b25" />
              <circle cx="34" cy="32" r="2.2" fill="#111" /><circle cx="46" cy="32" r="2.2" fill="#111" />
              <path d="M31 44q9 6 18 0" fill="none" stroke="#7a2a22" stroke-width="2.2" stroke-linecap="round" />
            </g>
            <g class="tg t-cool">
              <circle cx="142" cy="102" r="20" :fill="`url(#${card.key}-silver)`" stroke="#6d737c" stroke-width="1.5" />
              <circle cx="142" cy="103" r="13.5" fill="#e7a64b" stroke="#8f560f" stroke-width="1.2" />
              <rect x="131" y="98" width="22" height="7" rx="3.5" fill="#1d3b8a" /><rect x="133" y="99.5" width="7" height="4" rx="2" fill="#7aa2ff" /><rect x="144" y="99.5" width="7" height="4" rx="2" fill="#7aa2ff" />
            </g>
          </g>
        </svg>

        <div class="mt-6 text-[22px] font-medium leading-snug text-white">{{ t(card.title, card.titleEn) }}</div>
        <p class="mt-3 min-h-[48px] text-[15px] leading-6 text-slate-400">{{ t(card.desc, card.descEn) }}</p>
        <div class="mt-5 flex items-center gap-1 text-[16px] font-medium text-white">{{ t('바로 해보기', 'Try Now') }} <span aria-hidden="true">›</span></div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()

const cards = [
  {
    key: 'account',
    to: '/exchange/SAMSUNGUSDT',
    title: '통합 계정',
    titleEn: 'Unified Account',
    desc: '최대 20개의 서브계정으로 암호화폐를 거래하세요',
    descEn: 'Trade crypto with up to 20 sub-accounts'
  },
  {
    key: 'mini',
    to: '/exchange/BTCUSDT',
    title: '초보자를 위한 미니 계약',
    titleEn: 'Mini Contracts for Beginners',
    desc: '초보자도 쉽게 즐기는 무기한 선물',
    descEn: 'Perpetual Futures Simplified for Beginners'
  },
  {
    key: 'grid',
    to: '/markets',
    title: '옵션 그리드',
    titleEn: 'Options Grids',
    desc: '암호화폐 옵션과 무기한 선물을 재미있게 배우는 방법: 예측하고, 그리드로 거래하고, 이기는 법을 익히세요.',
    descEn: 'The fun way to learn crypto options & perpetual futures: predict, trade a grid, learn how to win.'
  },
  {
    key: 'gems',
    to: '/markets',
    title: '펌프 전에 보석 줍기',
    titleEn: 'Buy Gems Before Pump',
    desc: '미래를 앞서 포지션을 잡으세요',
    descEn: 'Position Ahead of the Future'
  }
]
</script>
