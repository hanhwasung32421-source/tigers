<template>
  <div class="space-y-8">
    <section class="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.10),transparent_35%),linear-gradient(180deg,#020509,#03060b_55%,#020509)] px-6 py-10 shadow-[0_12px_48px_rgba(0,0,0,0.35)] md:px-12 md:py-14">
      <div class="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div>
          <div class="text-xs font-bold tracking-[0.3em] text-slate-500">THE NEW STANDARD OF TRADING</div>
          <h1 class="mt-6 text-5xl font-black leading-[1.08] tracking-tight text-white md:text-6xl">
            더 빠르고,
            <br />
            더 강력한
            <br />
            디지털 자산 거래
          </h1>
          <p class="mt-6 max-w-xl text-base leading-7 text-slate-400">
            낮은 지연, 명확한 지갑 흐름, 강력한 거래 도구를 하나의 경험으로.<br />
            지금 {{ appName }}에서 시작하세요.
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <NuxtLink to="/auth/register" class="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:bg-slate-200">
              회원가입
            </NuxtLink>
            <NuxtLink
              to="/exchange/SAMSUNGUSDT"
              class="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-bold text-slate-100 hover:bg-white/[0.08]"
            >
              <span>⬇</span>
              앱 다운로드
            </NuxtLink>
          </div>
          <div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />실시간 리스크 관리</span>
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />24/7 고객지원</span>
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />투명한 자산 흐름</span>
          </div>
        </div>

        <div class="pb-6">
          <SquareOrbitVisual mark="U" caption="TRADE CORE" />
        </div>
      </div>
    </section>

    <section class="grid gap-5 md:grid-cols-3">
      <div class="rounded-3xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm font-semibold text-slate-400">Institutional Liquidity</div>
        <div class="mt-3 text-4xl font-bold text-white">Ultra-Tight Spreads</div>
        <p class="mt-4 text-sm leading-7 text-slate-400">
          Robust order matching engine executing up to 100,000 TPS.
        </p>
      </div>
      <div class="rounded-3xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm font-semibold text-slate-400">Security &amp; Custody</div>
        <div class="mt-3 text-4xl font-bold text-white">Cold Storage &amp; Risk Control</div>
        <p class="mt-4 text-sm leading-7 text-slate-400">
          Multilayered security framework to keep perpetual positions secure.
        </p>
      </div>
      <div class="rounded-3xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm font-semibold text-slate-400">Advanced Features</div>
        <div class="mt-3 text-4xl font-bold text-white">Flexible Margin Options</div>
        <p class="mt-4 text-sm leading-7 text-slate-400">
          Access isolated margin settings with customizable leverage up to 100x.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName
</script>
