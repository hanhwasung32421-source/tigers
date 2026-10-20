<template>
  <div class="mx-auto grid max-w-[1500px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
    <div>
      <h2 class="text-[34px] font-black leading-tight text-white md:text-[46px]">{{ t('언제 어디서나 거래하세요', 'Trade Anytime, Anywhere') }}</h2>
      <p class="mt-5 text-[18px] text-slate-400">
        {{ t('거래하고, 확인하고, 소식을 놓치지 마세요 — 모든 플랫폼 간 완벽한 동기화', 'Trade, Track, Stay Informed — Full cross-platform synchronization') }}
      </p>

      <div class="mt-12 flex flex-wrap items-start gap-8">
        <!-- QR 코드(사이트 주소) -->
        <NuxtLink :to="target" class="flex h-[176px] w-[176px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#ffffff] p-1" aria-label="QR code">
          <!-- https://bittigers.vercel.app/ 로 연결되는 QR. 스캐너가 잘 읽도록 주변 흰 여백(quiet zone)을 4칸 둔다 -->
          <svg :viewBox="`-4 -4 ${QR_N + 8} ${QR_N + 8}`" class="h-full w-full" shape-rendering="crispEdges">
            <rect x="-4" y="-4" :width="QR_N + 8" :height="QR_N + 8" fill="#ffffff" />
            <path :d="QR_PATH" fill="#111111" />
          </svg>
        </NuxtLink>

        <div class="grid grid-cols-2 gap-x-8 gap-y-3">
          <div class="col-span-1 text-[22px] font-medium text-white">iOS</div>
          <div class="col-span-1 text-[22px] font-medium text-white">Android</div>

          <NuxtLink :to="target" class="flex w-[190px] items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 hover:bg-white/[0.09]">
            <svg viewBox="0 0 24 24" class="h-8 w-8 shrink-0 text-white" fill="currentColor" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
            </svg>
            <span class="leading-tight"><span class="block text-[13px] text-slate-300">{{ t('다운로드', 'Get it on the') }}</span><span class="block text-[20px] font-medium text-white">App Store</span></span>
          </NuxtLink>
          <NuxtLink :to="target" class="flex w-[190px] items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 hover:bg-white/[0.09]">
            <svg viewBox="0 0 24 24" class="h-8 w-8 shrink-0" aria-hidden="true">
              <path fill="#00d2ff" d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2z" />
              <path fill="#ffce00" d="m16.1 15.4-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2z" />
              <path fill="#f43d54" d="m16.2 15.3-3.2-3.2-9.4 9.4c.4.4.9.4 1.6.1l11-6.3" />
              <path fill="#00e07d" d="M16.2 8.9 5.2 2.6c-.7-.4-1.2-.3-1.6.1l9.4 9.4 3.2-3.2z" />
            </svg>
            <span class="leading-tight"><span class="block text-[13px] text-slate-300">{{ t('다운로드', 'Get it on the') }}</span><span class="block text-[20px] font-medium text-white">GooglePlay</span></span>
          </NuxtLink>

          <NuxtLink :to="target" class="flex w-[190px] items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 hover:bg-white/[0.09]">
            <svg viewBox="0 0 24 24" class="h-8 w-8 shrink-0 text-white" fill="currentColor" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
            </svg>
            <span class="leading-tight"><span class="block text-[13px] text-slate-300">{{ t('다운로드', 'Get it on the') }}</span><span class="block text-[20px] font-medium text-white">Test Flight</span></span>
          </NuxtLink>
          <NuxtLink :to="target" class="flex w-[190px] items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3 hover:bg-white/[0.09]">
            <svg viewBox="0 0 24 24" class="h-8 w-8 shrink-0 text-white" fill="currentColor" aria-hidden="true">
              <path d="M6 18c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 0 0 3 0V19h2v3.5a1.5 1.5 0 0 0 3 0V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8A1.5 1.5 0 0 0 2 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 3.5 8zm17 0A1.5 1.5 0 0 0 19 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 20.5 8zM15.53 2.16l1.3-1.3a.5.5 0 0 0-.7-.71l-1.48 1.48A5.97 5.97 0 0 0 12 1.2c-.96 0-1.86.23-2.65.63L7.88.35a.5.5 0 0 0-.7.71l1.3 1.3A5.99 5.99 0 0 0 6 7h12c0-1.8-.8-3.4-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
            </svg>
            <span class="leading-tight"><span class="block text-[13px] text-slate-300">{{ t('APK 다운로드', 'Download the APK') }}</span><span class="block text-[20px] font-medium text-white">Android</span></span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 앱 화면(두 대의 휴대폰). 아래로 갈수록 서서히 사라진다 -->
    <div class="relative mx-auto h-[420px] w-full max-w-[520px] overflow-hidden" aria-hidden="true" style="-webkit-mask-image: linear-gradient(180deg, #000 70%, transparent 100%); mask-image: linear-gradient(180deg, #000 70%, transparent 100%)">
      <!-- 뒤 휴대폰: 선물 거래 화면 -->
      <div class="absolute left-0 top-[44px] w-[250px] rounded-[30px] border border-slate-300/60 bg-[#ffffff] px-4 pb-6 pt-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div class="flex items-center justify-between text-[10px] font-semibold text-slate-900"><span>10:35</span><span>▮▮▮</span></div>
        <div class="mt-3 flex gap-3 text-[9px] font-semibold text-slate-500"><span class="text-slate-900">USDT-M</span><span>MINI-M</span><span>Copy Trade</span></div>
        <div class="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-900"><span class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f7931a] text-[8px] text-white">₿</span>BTCUSDT Perpetual <span class="text-[8px] text-rose-500">-1.00%</span></div>
        <div class="mt-2 grid grid-cols-[1fr_1fr] gap-2">
          <div class="space-y-[3px] text-[8px]">
            <div v-for="r in asks" :key="r.p" class="flex justify-between"><span class="text-rose-500">{{ r.p }}</span><span class="text-slate-600">{{ r.q }}</span></div>
            <div class="py-1 text-[11px] font-bold text-emerald-500">65077.7 ▾</div>
            <div v-for="r in bids" :key="r.p" class="flex justify-between"><span class="text-emerald-500">{{ r.p }}</span><span class="text-slate-600">{{ r.q }}</span></div>
          </div>
          <div class="space-y-2 text-[8px] text-slate-500">
            <div class="flex gap-1"><span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">Isolated</span><span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">10X</span></div>
            <div class="rounded bg-[#f0b90b]/90 px-2 py-1.5 text-center font-bold text-slate-900">Open Position</div>
            <div class="rounded border border-slate-200 px-2 py-1.5">Limit</div>
            <div class="rounded border border-slate-200 px-2 py-1.5">65081.9</div>
            <div class="rounded border border-slate-200 px-2 py-1.5">Amount</div>
            <div class="h-1 rounded bg-slate-200" />
            <div class="rounded bg-emerald-500/90 px-2 py-2 text-center font-bold text-white">Buy / Long</div>
          </div>
        </div>
      </div>

      <!-- 앞 휴대폰: 자산 화면 -->
      <div class="absolute right-0 top-0 w-[260px] rounded-[30px] border border-slate-300/60 bg-[#ffffff] px-4 pb-6 pt-3 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
        <div class="flex items-center justify-between text-[10px] font-semibold text-slate-900"><span>10:35</span><span>▮▮▮</span></div>
        <div class="mt-2 flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded bg-[#f0b90b] text-[10px] font-black text-slate-900">K</span>
          <div class="h-5 flex-1 rounded-full bg-slate-100 px-2 text-[8px] leading-5 text-slate-400">Search tokens</div>
        </div>
        <div class="mt-2 truncate text-[7px] text-slate-500">KTX Lists 10 New US Stock Perpetual Contracts</div>
        <div class="mt-3 text-[8px] text-slate-500">Total Asset Valuation</div>
        <div class="flex items-center justify-between">
          <div class="text-[18px] font-bold text-slate-900">90.80 <span class="text-[9px]">USDT</span></div>
          <span class="rounded bg-[#f0b90b] px-3 py-1 text-[9px] font-bold text-slate-900">Deposit</span>
        </div>
        <div class="mt-3 grid grid-cols-5 gap-1 text-center text-[7px] text-slate-600">
          <div v-for="i in ['Earn', 'Buy', 'Rewards', 'CopyTrade', 'Launchpool']" :key="i"><div class="mx-auto mb-1 h-6 w-6 rounded-lg bg-[#f0b90b]/25" />{{ i }}</div>
        </div>
        <div class="mt-3 rounded-lg bg-slate-100 px-3 py-3 text-[9px] font-bold text-slate-900">KTX Copy Trading Live <span class="ml-1 rounded bg-[#f0b90b] px-1 py-0.5 text-[7px]">Join Copy Trading Now</span></div>
        <div class="mt-3 flex justify-between text-[9px] font-bold text-slate-900"><span>Finance</span><span>›</span></div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-[8px]">
          <div class="rounded-lg border border-slate-200 p-2"><div class="font-bold text-slate-900">USDT</div><div class="mt-1 text-slate-600">2.00%~5.00%</div></div>
          <div class="rounded-lg border border-slate-200 p-2"><div class="font-bold text-slate-900">USDT</div><div class="mt-1 text-slate-600">9.00%</div></div>
        </div>
        <div class="mt-3 flex justify-between text-[9px] font-bold text-slate-900"><span>Market</span><span>›</span></div>
        <div class="mt-2 rounded-lg border border-slate-200 p-2 text-[8px] text-slate-600">BTC Market Cap Dominance <span class="ml-1 font-bold text-slate-900">59.04%</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const { me } = useMe()
// 스토어/QR 버튼: 로그인 전에는 로그인 화면으로, 로그인했다면 삼성전자(SAMSUNGUSDT) 차트로 이동한다(첫 화면의 앱 다운로드 버튼과 같은 규칙).
const target = computed(() => (me.value ? '/exchange/SAMSUNGUSDT' : '/auth/login'))

const QR_N = 29
const QR_PATH = 'M0 0h7v1h-7zM12 0h1v1h-1zM15 0h2v1h-2zM18 0h3v1h-3zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM9 1h1v1h-1zM12 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM11 2h1v1h-1zM14 2h1v1h-1zM16 2h1v1h-1zM19 2h1v1h-1zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM12 3h1v1h-1zM16 3h2v1h-2zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h6v1h-6zM17 4h4v1h-4zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h4v1h-4zM13 5h4v1h-4zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h3v1h-3zM12 7h2v1h-2zM15 7h1v1h-1zM18 7h2v1h-2zM0 8h1v1h-1zM2 8h5v1h-5zM9 8h1v1h-1zM11 8h1v1h-1zM14 8h2v1h-2zM17 8h2v1h-2zM20 8h1v1h-1zM22 8h5v1h-5zM0 9h1v1h-1zM4 9h2v1h-2zM7 9h1v1h-1zM12 9h1v1h-1zM15 9h10v1h-10zM28 9h1v1h-1zM4 10h1v1h-1zM6 10h7v1h-7zM17 10h1v1h-1zM20 10h3v1h-3zM24 10h1v1h-1zM0 11h1v1h-1zM2 11h4v1h-4zM9 11h3v1h-3zM14 11h1v1h-1zM16 11h1v1h-1zM18 11h1v1h-1zM20 11h1v1h-1zM23 11h3v1h-3zM27 11h1v1h-1zM1 12h2v1h-2zM5 12h4v1h-4zM10 12h1v1h-1zM16 12h2v1h-2zM23 12h1v1h-1zM25 12h2v1h-2zM0 13h2v1h-2zM3 13h3v1h-3zM7 13h5v1h-5zM13 13h3v1h-3zM18 13h7v1h-7zM28 13h1v1h-1zM0 14h1v1h-1zM2 14h3v1h-3zM6 14h4v1h-4zM11 14h1v1h-1zM13 14h4v1h-4zM18 14h1v1h-1zM24 14h3v1h-3zM3 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM9 15h5v1h-5zM15 15h1v1h-1zM19 15h2v1h-2zM22 15h3v1h-3zM27 15h1v1h-1zM1 16h2v1h-2zM6 16h1v1h-1zM8 16h1v1h-1zM11 16h1v1h-1zM14 16h2v1h-2zM17 16h1v1h-1zM20 16h1v1h-1zM23 16h1v1h-1zM25 16h2v1h-2zM0 17h1v1h-1zM2 17h3v1h-3zM7 17h4v1h-4zM15 17h2v1h-2zM19 17h6v1h-6zM26 17h1v1h-1zM28 17h1v1h-1zM0 18h1v1h-1zM4 18h1v1h-1zM6 18h1v1h-1zM8 18h1v1h-1zM18 18h1v1h-1zM23 18h2v1h-2zM26 18h1v1h-1zM0 19h1v1h-1zM3 19h1v1h-1zM7 19h2v1h-2zM10 19h2v1h-2zM14 19h1v1h-1zM16 19h1v1h-1zM18 19h3v1h-3zM27 19h1v1h-1zM0 20h1v1h-1zM2 20h6v1h-6zM9 20h1v1h-1zM16 20h2v1h-2zM19 20h6v1h-6zM26 20h3v1h-3zM8 21h1v1h-1zM10 21h1v1h-1zM13 21h3v1h-3zM20 21h1v1h-1zM24 21h5v1h-5zM0 22h7v1h-7zM9 22h1v1h-1zM11 22h1v1h-1zM13 22h4v1h-4zM18 22h3v1h-3zM22 22h1v1h-1zM24 22h3v1h-3zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h1v1h-1zM10 23h1v1h-1zM13 23h1v1h-1zM15 23h1v1h-1zM18 23h1v1h-1zM20 23h1v1h-1zM24 23h1v1h-1zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM8 24h1v1h-1zM10 24h2v1h-2zM14 24h2v1h-2zM17 24h2v1h-2zM20 24h5v1h-5zM26 24h1v1h-1zM28 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM8 25h5v1h-5zM15 25h6v1h-6zM25 25h2v1h-2zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM8 26h1v1h-1zM10 26h2v1h-2zM13 26h2v1h-2zM17 26h1v1h-1zM22 26h6v1h-6zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM11 27h1v1h-1zM14 27h1v1h-1zM16 27h1v1h-1zM19 27h3v1h-3zM25 27h1v1h-1zM27 27h1v1h-1zM0 28h7v1h-7zM8 28h1v1h-1zM11 28h1v1h-1zM18 28h2v1h-2zM21 28h2v1h-2zM24 28h1v1h-1zM26 28h1v1h-1z'

const asks = [
  { p: '65081.4', q: '618.6' },
  { p: '65081.1', q: '643.65' },
  { p: '65080.9', q: '1644.46' },
  { p: '65080.2', q: '118.641' }
]
const bids = [
  { p: '65077.8', q: '115.82K' },
  { p: '65077.3', q: '800K' },
  { p: '65076.7', q: '683.83' },
  { p: '65076.5', q: '649.27' }
]
</script>
