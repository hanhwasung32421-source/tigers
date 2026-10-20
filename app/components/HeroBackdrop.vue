<template>
  <!-- 첫 화면 배경 영상(코드로 만든 20초 반복 모션 영상). 흰 필터를 덮어 글자가 잘 보이게 하고, 마우스에는 반응하지 않는다.
       장면 A(0~9초) 우리 홈페이지가 스크롤되는 화면 → 장면 B(9~15초) 휴대폰으로 트레이딩하는 여성 → 장면 C(15~20초) 모바일 앱 차트/시세 -->
  <div class="hb-root pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <!-- 장면 A: 홈페이지 스크롤 -->
    <div class="hb-scene hb-a absolute left-[30%] top-[5%] w-[68%]">
      <div class="overflow-hidden rounded-2xl border border-slate-300/60 bg-[#ffffff] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div class="flex items-center gap-1.5 border-b border-slate-200 bg-[#f3f4f6] px-4 py-2.5">
          <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span class="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span class="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span class="ml-4 h-5 flex-1 rounded-md bg-[#ffffff] px-3 text-[10px] leading-5 text-slate-400">bittigers.vercel.app</span>
        </div>
        <div class="overflow-hidden" style="aspect-ratio: 16 / 10">
          <div class="hb-scroll">
            <img v-for="n in 6" :key="n" :src="`/hero/scroll-${n}.jpg`" alt="" class="block w-full" draggable="false" />
          </div>
        </div>
      </div>
    </div>

    <!-- 장면 B: 휴대폰으로 트레이딩하는 여성(일러스트) -->
    <div class="hb-scene hb-b absolute left-[46%] top-[3%] h-[80%] w-[36%]">
      <svg viewBox="0 0 400 520" class="hb-bob h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hb-hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#d9a35b" />
            <stop offset="100%" stop-color="#8d5a2b" />
          </linearGradient>
          <linearGradient id="hb-screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#eaf7ef" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="270" r="190" fill="#fff3cd" />
        <circle cx="200" cy="270" r="140" fill="#ffe9a8" fill-opacity="0.6" />
        <!-- 뒷머리 -->
        <path d="M128 222 C104 120 158 66 206 66 C258 66 298 122 276 222 C294 300 272 364 250 388 L150 388 C126 364 108 300 128 222Z" fill="url(#hb-hair)" />
        <!-- 상체(재킷) -->
        <path d="M60 520 C66 418 106 364 166 344 L236 344 C296 364 336 418 342 520Z" fill="#2d3140" />
        <path d="M176 344 L201 424 L226 344Z" fill="#ffffff" />
        <path d="M166 344 L201 432 L176 344Z" fill="#232634" />
        <!-- 목 -->
        <rect x="182" y="292" width="38" height="62" rx="15" fill="#efb995" />
        <!-- 얼굴 -->
        <ellipse cx="201" cy="226" rx="53" ry="63" fill="#f4c6a5" />
        <!-- 앞머리 -->
        <path d="M146 214 C146 140 196 108 256 208 C242 160 208 148 190 148 C168 148 152 176 146 214Z" fill="url(#hb-hair)" />
        <path d="M148 206 C140 250 142 300 150 340 C132 300 128 250 148 206Z" fill="url(#hb-hair)" />
        <path d="M254 206 C262 250 262 300 252 340 C270 300 274 250 254 206Z" fill="url(#hb-hair)" />
        <!-- 눈/눈썹/코/입 -->
        <ellipse cx="181" cy="230" rx="5.5" ry="7" fill="#2a2a35" /><ellipse cx="223" cy="230" rx="5.5" ry="7" fill="#2a2a35" />
        <circle cx="183" cy="227" r="1.8" fill="#ffffff" /><circle cx="225" cy="227" r="1.8" fill="#ffffff" />
        <path d="M169 214 q11 -8 22 0 M212 214 q11 -8 22 0" stroke="#6b4423" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M202 234 q-6 20 2 25" stroke="#d9a07c" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M184 266 q18 15 36 0 q-18 7 -36 0Z" fill="#c7585a" />
        <circle cx="166" cy="252" r="9" fill="#f29c8f" fill-opacity="0.35" /><circle cx="238" cy="252" r="9" fill="#f29c8f" fill-opacity="0.35" />
        <!-- 팔 + 손 -->
        <path d="M300 382 C346 412 336 480 288 482 L246 482 C236 446 248 404 272 382Z" fill="#2d3140" />
        <!-- 휴대폰 -->
        <g transform="rotate(-8 262 408)">
          <rect x="224" y="326" width="82" height="142" rx="13" fill="#1b1e27" />
          <rect x="230" y="334" width="70" height="126" rx="9" fill="url(#hb-screen)" />
          <text x="236" y="352" font-size="8" font-weight="700" fill="#1b1e27" font-family="Inter, Arial, sans-serif">BTC/USDT</text>
          <text x="236" y="366" font-size="11" font-weight="800" fill="#16a34a" font-family="Inter, Arial, sans-serif">+2.51%</text>
          <g class="hb-candles">
            <g v-for="(c, i) in candles" :key="i" class="hb-candle" :style="{ '--d': i * 0.35 + 's' }">
              <line :x1="c.x" :y1="c.y1" :x2="c.x" :y2="c.y2" :stroke="c.up ? '#16a34a' : '#ef4444'" stroke-width="1.5" />
              <rect :x="c.x - 3.5" :y="c.b1" width="7" :height="c.b2 - c.b1" rx="1" :fill="c.up ? '#16a34a' : '#ef4444'" />
            </g>
          </g>
          <rect x="236" y="436" width="58" height="14" rx="5" fill="#16a34a" />
          <text x="265" y="446" text-anchor="middle" font-size="7" font-weight="700" fill="#ffffff" font-family="Inter, Arial, sans-serif">Buy / Long</text>
        </g>
        <!-- 엄지 -->
        <path d="M248 470 C228 470 212 454 218 438 C224 426 244 430 256 442Z" fill="#f4c6a5" />
        <path d="M296 392 C312 392 318 410 306 420 C300 412 296 402 296 392Z" fill="#f4c6a5" />
      </svg>
      <div class="hb-chip hb-chip-1 absolute left-[4%] top-[26%] rounded-xl bg-[#ffffff] px-3 py-2 text-[12px] font-bold text-slate-900 shadow-lg">
        <span class="text-emerald-500">▲ +2.51%</span> <span class="ml-1 text-slate-500">SAMSUNG</span>
      </div>
      <div class="hb-chip hb-chip-2 absolute right-[2%] top-[40%] rounded-xl bg-[#ffffff] px-3 py-2 text-[12px] font-bold text-slate-900 shadow-lg">BTC 65,077.7</div>
      <div class="hb-chip hb-chip-3 absolute bottom-[14%] left-[6%] rounded-xl bg-[#f0b90b] px-3 py-2 text-[12px] font-bold text-slate-900 shadow-lg">Long ▮▮▮</div>
    </div>

    <!-- 장면 C: 모바일 앱 차트/시세 -->
    <div class="hb-scene hb-c absolute left-[36%] top-[6%] h-[88%] w-[60%]">
      <div class="absolute left-[8%] top-0 w-[250px] rounded-[30px] border border-slate-300/70 bg-[#ffffff] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div class="flex items-center justify-between text-[10px] font-semibold text-slate-900"><span>10:35</span><span>▮▮▮</span></div>
        <div class="mt-3 text-[11px] font-bold text-slate-900">SAMSUNGUSDT <span class="ml-1 text-emerald-500">+2.51%</span></div>
        <svg viewBox="0 0 220 120" class="mt-2 w-full">
          <path d="M0 100 H220 M0 70 H220 M0 40 H220" stroke="#e5e7eb" stroke-width="1" />
          <polyline class="hb-draw" points="0,98 20,86 40,92 62,64 84,74 106,48 128,60 150,34 172,44 196,20 220,14" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <polyline class="hb-draw hb-draw-2" points="0,98 20,86 40,92 62,64 84,74 106,48 128,60 150,34 172,44 196,20 220,14 220,120 0,120" fill="#16a34a" fill-opacity="0.12" stroke="none" />
        </svg>
        <div class="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <div class="rounded-lg bg-slate-100 p-2"><div class="text-slate-500">Entry</div><div class="font-bold text-slate-900">159.44</div></div>
          <div class="rounded-lg bg-slate-100 p-2"><div class="text-slate-500">P&amp;L</div><div class="font-bold text-emerald-500">+93.46 USDT</div></div>
        </div>
        <div class="mt-3 rounded-lg bg-[#f0b90b] py-2 text-center text-[11px] font-bold text-slate-900">Buy / Long</div>
      </div>
      <div class="hb-slide hb-slide-1 absolute right-[2%] top-[6%] w-[210px] rounded-2xl bg-[#ffffff] p-3 text-[11px] shadow-xl">
        <div class="flex items-center justify-between font-bold text-slate-900"><span>PEPE</span><span class="text-emerald-500">+2.47%</span></div>
        <div class="mt-1 text-[16px] font-bold text-slate-900">0.00000416</div>
      </div>
      <div class="hb-slide hb-slide-2 absolute right-[10%] top-[34%] w-[210px] rounded-2xl bg-[#ffffff] p-3 text-[11px] shadow-xl">
        <div class="flex items-center justify-between font-bold text-slate-900"><span>OPENAIUSDT</span><span class="text-rose-500">-1.56%</span></div>
        <div class="mt-1 text-[16px] font-bold text-slate-900">147.74</div>
      </div>
      <div class="hb-slide hb-slide-3 absolute right-[0%] top-[62%] w-[210px] rounded-2xl bg-[#ffffff] p-3 text-[11px] shadow-xl">
        <div class="flex items-center justify-between font-bold text-slate-900"><span>ARMUSDT</span><span class="text-emerald-500">+5.35%</span></div>
        <div class="mt-1 text-[16px] font-bold text-slate-900">222.94</div>
      </div>
    </div>

    <!-- 흰 필터(글자가 잘 보이도록). 화이트 테마에서는 흰색, 블랙 테마에서는 어두운 색으로 덮인다 -->
    <div class="absolute inset-0 bg-[#020b16]/70" />
    <!-- 아래쪽은 서서히 페이지 배경으로 이어지게 -->
    <div class="hb-fade absolute inset-x-0 bottom-0 h-[26%]" />
  </div>
</template>

<script setup lang="ts">
// 휴대폰 화면 안의 캔들(장면 B). x좌표와 몸통/꼬리 위치
const candles = [
  { x: 242, up: true, y1: 396, y2: 420, b1: 402, b2: 414 },
  { x: 252, up: false, y1: 392, y2: 418, b1: 398, b2: 412 },
  { x: 262, up: true, y1: 384, y2: 414, b1: 390, b2: 408 },
  { x: 272, up: true, y1: 372, y2: 404, b1: 378, b2: 398 },
  { x: 282, up: false, y1: 370, y2: 398, b1: 376, b2: 392 },
  { x: 292, up: true, y1: 358, y2: 390, b1: 364, b2: 384 }
]
</script>
