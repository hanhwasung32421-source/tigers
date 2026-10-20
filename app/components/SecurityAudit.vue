<template>
  <div class="mx-auto grid max-w-[1500px] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,820px)]">
    <div>
      <h2 class="text-[28px] font-medium leading-tight text-white md:text-[32px]">{{ t('보안 감사', 'Security Audit') }}</h2>
      <p class="mt-6 max-w-[640px] text-[16px] leading-7 text-slate-400">
        {{
          t(
            '글로벌 최고 수준의 보안 기관들과 긴밀히 협력하여 핵심 시스템, 스마트 컨트랙트, 지갑 구조 등에 대한 다층 감사와 실시간 모니터링을 수행함으로써 사용자 자산의 안전과 안정적이고 신뢰할 수 있는 거래 환경을 보장합니다.',
            'We collaborate deeply with global top security institutions, conducting multi-layer audits and real-time monitoring of core systems, smart contracts, wallet architecture, and more to ensure user asset security and a stable, reliable trading environment.'
          )
        }}
      </p>

      <!-- 금빛 방패 + 은빛 링 일러스트 -->
      <svg viewBox="0 0 240 220" class="mt-6 h-[210px] w-[230px]" aria-hidden="true">
        <defs>
          <linearGradient id="sa-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="30%" stop-color="#c4c9d0" />
            <stop offset="62%" stop-color="#7e848d" />
            <stop offset="100%" stop-color="#eef0f3" />
          </linearGradient>
          <linearGradient id="sa-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff3b8" />
            <stop offset="35%" stop-color="#f1bc35" />
            <stop offset="70%" stop-color="#a56f08" />
            <stop offset="100%" stop-color="#f7d36b" />
          </linearGradient>
          <linearGradient id="sa-gold-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#d79a1a" />
            <stop offset="100%" stop-color="#7c5006" />
          </linearGradient>
          <radialGradient id="sa-shine" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
          <filter id="sa-shadow" x="-30%" y="-30%" width="170%" height="170%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.3" />
          </filter>
        </defs>
        <g filter="url(#sa-shadow)">
          <!-- 은빛 링(일부가 잘린 모양) -->
          <path d="M120 22a88 88 0 1 0 88 88" fill="none" stroke="url(#sa-silver)" stroke-width="22" stroke-linecap="round" />
          <path d="M120 22a88 88 0 1 0 88 88" fill="none" stroke="#6d737c" stroke-opacity="0.35" stroke-width="1.5" transform="translate(0 0)" />
          <!-- 금빛 캔들 -->
          <g>
            <line x1="188" y1="66" x2="188" y2="152" stroke="#b9820f" stroke-width="3" />
            <rect x="178" y="84" width="20" height="46" rx="3" fill="url(#sa-gold)" stroke="#8d5d08" />
            <line x1="208" y1="84" x2="208" y2="170" stroke="#b9820f" stroke-width="3" />
            <rect x="199" y="104" width="18" height="42" rx="3" fill="url(#sa-gold-dark)" stroke="#6a4305" />
          </g>
          <!-- 방패 -->
          <path d="M112 36 L164 52 V108 C164 142 142 166 112 178 C82 166 60 142 60 108 V52 Z" fill="url(#sa-gold)" stroke="#8d5d08" stroke-width="2" />
          <path d="M112 46 L154 59 V108 C154 136 136 156 112 167 C88 156 70 136 70 108 V59 Z" fill="url(#sa-gold-dark)" stroke="#f7d36b" stroke-width="1.5" stroke-opacity="0.8" />
          <path d="M112 36 L164 52 V70 C150 62 132 56 112 56 C92 56 74 62 60 70 V52 Z" fill="url(#sa-shine)" />
          <circle cx="112" cy="108" r="26" fill="url(#sa-gold)" stroke="#8d5d08" stroke-width="1.5" />
          <path d="M100 109l9 9 17-19" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M100 109l9 9 17-19" fill="none" stroke="#c78a12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </svg>
    </div>

    <!-- 협력 보안 기관 타일(모션그래픽: 마우스에는 반응하지 않는다) -->
    <div class="sa-panel pointer-events-none relative overflow-hidden rounded-3xl p-6 md:p-10" aria-hidden="true" style="background: linear-gradient(160deg, #fffdf8 0%, #fdf3df 100%)">
      <div class="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <div v-for="(tile, i) in tiles" :key="tile.key" class="sa-tile" :style="{ '--i': i }">
          <div class="sa-tile-inner flex aspect-square flex-col items-center justify-center rounded-[28px] border bg-[#ffffff] px-2 text-center" style="border-color: #efe7d6; color: #111111; --f: calc(var(--i) * -0.55s)">
            <!-- CERTIK -->
            <template v-if="tile.key === 'certik'">
              <svg viewBox="0 0 60 48" class="h-[44px] w-[56px]"><path d="M30 4 L8 12 L18 44 L30 36 L42 44 L52 12 Z M30 36 L22 18 M30 36 L38 18" fill="none" stroke="#111" stroke-width="3" stroke-linejoin="round" /></svg>
              <div class="mt-2 text-[15px] font-semibold tracking-[0.28em]" style="color: #111">CERTIK</div>
            </template>
            <!-- IOActive -->
            <template v-else-if="tile.key === 'ioactive'">
              <div class="text-[26px] font-black tracking-tight" style="color: #111"><span style="color: #c8102e">IO</span>Active</div>
            </template>
            <!-- Least Authority -->
            <template v-else-if="tile.key === 'least'">
              <svg viewBox="0 0 70 50" class="h-[44px] w-[62px]"><path d="M8 42 L28 8 L40 26 L52 6 L64 42" fill="none" stroke="#111" stroke-width="2.4" stroke-linejoin="round" /><circle cx="28" cy="8" r="3" fill="#fff" stroke="#c8102e" stroke-width="2" /><circle cx="52" cy="6" r="3" fill="#fff" stroke="#c8102e" stroke-width="2" /><circle cx="8" cy="42" r="3" fill="#fff" stroke="#c8102e" stroke-width="2" /></svg>
              <div class="mt-1 text-[14px] font-bold leading-tight" style="color: #111">Least Authority</div>
              <div class="text-[7px] font-semibold tracking-[0.18em]" style="color: #333">PRIVACY MATTERS</div>
            </template>
            <!-- 방패+픽셀 -->
            <template v-else-if="tile.key === 'shield'">
              <svg viewBox="0 0 80 64" class="h-[58px] w-[72px]"><path d="M6 6 L38 6 L38 58 C20 52 6 38 6 22 Z" fill="#111" /><path d="M38 6 L38 58 C56 52 70 38 70 22 L70 12 Z" fill="none" stroke="#111" stroke-width="2.5" /><g fill="#111"><rect x="44" y="14" width="6" height="6" /><rect x="54" y="18" width="5" height="5" /><rect x="48" y="26" width="9" height="9" /><rect x="60" y="30" width="5" height="5" /><rect x="52" y="42" width="6" height="6" /></g></svg>
            </template>
            <!-- TRAIL OF BITS -->
            <template v-else-if="tile.key === 'trail'">
              <div class="-skew-x-6 text-[26px] font-black italic leading-[0.9]" style="color: #111">TRAIL<br />OF<br />BITS</div>
            </template>
            <!-- wizardsardine -->
            <template v-else-if="tile.key === 'wizard'">
              <svg viewBox="0 0 60 56" class="h-[50px] w-[54px]"><circle cx="30" cy="34" r="16" fill="none" stroke="#111" stroke-width="3" /><path d="M20 22 L30 4 L40 22 Z" fill="#111" /><path d="M24 36q6 8 12 0" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" /></svg>
              <div class="mt-1 text-[14px] font-semibold" style="color: #111">wizardsardine</div>
            </template>
            <!-- ackee -->
            <template v-else-if="tile.key === 'ackee'">
              <div class="text-[34px] font-black leading-none tracking-tight" style="color: #111">ackee</div>
              <div class="mt-1 text-[9px] font-medium" style="color: #333">blockchain security</div>
            </template>
            <!-- MORE -->
            <template v-else>
              <div class="text-[20px] font-medium tracking-wide" style="color: #8a8a8a">{{ t('더보기', 'MORE') }}</div>
            </template>
          </div>
        </div>
      </div>
      <!-- 지나가는 빛줄기 -->
      <div class="sa-sweep" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const tiles = [{ key: 'certik' }, { key: 'ioactive' }, { key: 'least' }, { key: 'shield' }, { key: 'trail' }, { key: 'wizard' }, { key: 'ackee' }, { key: 'more' }]
</script>
