<template>
  <div class="space-y-8">
    <section class="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.12),transparent_32%),linear-gradient(180deg,#020817,#02101d_55%,#020817)] px-6 py-8 shadow-[0_12px_48px_rgba(0,0,0,0.32)] md:px-12 md:py-12">
      <div class="max-w-4xl">
        <div class="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/8 px-4 py-1.5 text-sm font-medium text-cyan-200">
          UsdtFuture Perpetual Trading Platform
        </div>
        <h1 class="mt-8 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl">
          Trade Crypto Perpetuals
          <br />
          with Up to
          <span class="text-[#36f2c6]"> 100x</span>
          <br />
          <span class="text-[#36f2c6]">Leverage</span>
        </h1>
        <p class="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          Experience institutional-grade liquidity, lightning-fast execution, and robust risk control frameworks on the world’s premier derivatives exchange.
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="rounded-2xl bg-[#07b88e] px-6 py-3 text-base font-semibold text-white hover:bg-[#0bc69a]">
            Start Trading Now
          </NuxtLink>
          <NuxtLink to="/wallet" class="rounded-2xl border border-cyan-500/10 bg-[#04111c] px-6 py-3 text-base font-semibold text-slate-100 hover:bg-[#081827]">
            My Assets
          </NuxtLink>
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
