<template>
  <div class="space-y-12 py-6">
    <!-- Hero Section -->
    <section class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c101d] via-[#080b15] to-[#04060b] p-8 md:p-12 shadow-2xl">
      <!-- Decorative Background Orbs -->
      <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
      <div class="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl"></div>

      <div class="max-w-2xl relative z-10 space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
          <span class="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
          UsdtFuture Perpetual Trading Platform
        </div>
        
        <h1 class="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl bg-clip-text bg-gradient-to-r from-slate-50 to-slate-200">
          Trade Crypto Perpetuals with Up to <span class="text-[#00b075]">100x Leverage</span>
        </h1>
        
        <p class="text-base md:text-lg text-slate-400 font-normal leading-relaxed">
          Experience institutional-grade liquidity, lightning-fast execution, and robust risk control frameworks on the world's premier derivatives exchange.
        </p>

        <div class="pt-4 flex flex-wrap gap-4">
          <NuxtLink to="/exchange/DOGEUSDT" class="rounded-xl bg-[#00b075] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00b075]/20 hover:bg-[#009b67] transition duration-200 transform active:scale-95">
            Start Trading Now
          </NuxtLink>
          <NuxtLink to="/wallet" class="rounded-xl bg-white/5 border border-white/10 px-6 py-3.5 text-sm font-bold text-slate-300 hover:bg-white/10 transition duration-200">
            My Assets
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Key Metrics Grid -->
    <section class="grid gap-6 md:grid-cols-3">
      <div class="rounded-2xl border border-white/5 bg-[#0b0f19]/60 p-6 hover:border-white/10 transition duration-200">
        <div class="text-sm font-semibold text-slate-400">Institutional Liquidity</div>
        <div class="mt-2 text-2xl font-bold text-slate-100">Ultra-Tight Spreads</div>
        <div class="mt-2 text-xs text-slate-500">Robust order matching engine executing up to 100,000 TPS.</div>
      </div>
      <div class="rounded-2xl border border-white/5 bg-[#0b0f19]/60 p-6 hover:border-white/10 transition duration-200">
        <div class="text-sm font-semibold text-slate-400">Security & Custody</div>
        <div class="mt-2 text-2xl font-bold text-slate-100">Cold Storage & Risk Control</div>
        <div class="mt-2 text-xs text-slate-500">Multilayered security framework to keep perpetual positions secure.</div>
      </div>
      <div class="rounded-2xl border border-white/5 bg-[#0b0f19]/60 p-6 hover:border-white/10 transition duration-200">
        <div class="text-sm font-semibold text-slate-400">Advanced Features</div>
        <div class="mt-2 text-2xl font-bold text-slate-100">Flexible Margin Options</div>
        <div class="mt-2 text-xs text-slate-500">Access isolated margin settings with customizable leverage up to 100x.</div>
      </div>
    </section>
  </div>
</template>
