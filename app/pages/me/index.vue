<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">{{ t('내 계정', 'My Account') }}</h1>
      <p class="mt-2 text-sm text-slate-400">{{ t('계정 정보 및 거래 현황', 'Account info and trading status') }}</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">{{ t('가상 잔고 (USDT)', 'Virtual Balance (USDT)') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ balance.toFixed(2) }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">{{ t('오픈 포지션', 'Open Positions') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ positions.length }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">{{ t('최근 거래', 'Recent Trades') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ trades.length }}</div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-end justify-between">
          <h2 class="font-semibold">{{ t('오픈 포지션', 'Open Positions') }}</h2>
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="text-sm text-indigo-300 hover:underline">{{ t('거래로 이동', 'Go to Trading') }}</NuxtLink>
        </div>
        <div class="mt-3 space-y-2">
          <div v-if="positions.length === 0" class="text-sm text-slate-400">{{ t('오픈 포지션이 없습니다.', 'No open positions.') }}</div>
          <div v-for="p in positions" :key="p.id" class="rounded-xl bg-black/20 p-4 text-sm">
            <div class="flex justify-between">
              <div class="font-medium">{{ p.symbol }} · {{ p.side.toUpperCase() }}</div>
              <div class="font-mono">x{{ p.leverage }}</div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>{{ t('수량', 'Qty') }}: <span class="font-mono text-slate-200">{{ p.qty }}</span></div>
              <div>{{ t('진입가', 'Entry') }}: <span class="font-mono text-slate-200">{{ p.entry_price }}</span></div>
              <div>{{ t('증거금', 'Margin') }}: <span class="font-mono text-slate-200">{{ p.margin }}</span></div>
              <div>{{ t('생성', 'Created') }}: <span class="font-mono text-slate-200">{{ p.created_at.slice(0, 19) }}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-end justify-between">
          <h2 class="font-semibold">{{ t('거래 내역(최근 50)', 'Trade History (Last 50)') }}</h2>
          <NuxtLink to="/profit" class="text-sm text-indigo-300 hover:underline">{{ t('수익인증', 'Profit Proof') }}</NuxtLink>
        </div>
        <div class="mt-3 space-y-2">
          <div v-if="trades.length === 0" class="text-sm text-slate-400">{{ t('거래 내역이 없습니다.', 'No trade history available.') }}</div>
          <div v-for="tr in trades" :key="tr.id" class="rounded-xl bg-black/20 p-4 text-sm">
            <div class="flex justify-between">
              <div class="font-medium">{{ tr.symbol }} · {{ tr.side.toUpperCase() }} · x{{ tr.leverage }}</div>
              <div class="font-mono" :class="tr.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ tr.pnl >= 0 ? '+' : '' }}{{ Number(tr.pnl).toFixed(2) }} USDT
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>{{ t('수량', 'Qty') }}: <span class="font-mono text-slate-200">{{ tr.qty }}</span></div>
              <div>{{ t('진입/청산', 'Entry/Exit') }}: <span class="font-mono text-slate-200">{{ tr.entry_price }} → {{ tr.exit_price }}</span></div>
              <div>{{ t('시간', 'Time') }}: <span class="font-mono text-slate-200">{{ tr.created_at.slice(0, 19) }}</span></div>
              <div>ID: <span class="font-mono text-slate-200">#{{ tr.id }}</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { t } = useLocale()
const balance = ref(0)
const positions = ref<any[]>([])
const trades = ref<any[]>([])

// SSR(주소창 직접 접속/새로고침)에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
// 로그인 상태인데도 /api/account가 401로 실패하는 문제를 막을 수 있다.
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const data = await $fetch<any>('/api/account', { headers, credentials: 'include', query: { parts: 'balance,positions,trades' } })
balance.value = data.balance.usdt
positions.value = data.positions
trades.value = data.trades
</script>
