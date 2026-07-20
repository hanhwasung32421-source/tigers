<template>
  <div class="space-y-6">
    <HeaderTabs active="trades" />

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="font-semibold">선물 거래 내역</h2>
      <p class="mt-2 text-sm text-slate-400">청산된 거래(손익 포함) 내역입니다.</p>

      <div class="mt-4 space-y-2">
        <div v-if="trades.length === 0" class="text-sm text-slate-400">거래 내역이 없습니다.</div>
        <div v-for="t in trades" :key="t.id" class="rounded-xl bg-black/20 p-4 text-sm">
          <div class="flex justify-between">
            <div class="font-medium">{{ t.symbol }} · {{ t.side.toUpperCase() }} · x{{ t.leverage }}</div>
            <div class="font-mono" :class="t.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ t.pnl >= 0 ? '+' : '' }}{{ Number(t.pnl).toFixed(2) }} USDT
            </div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>수량: <span class="font-mono text-slate-200">{{ t.qty }}</span></div>
            <div>진입/청산: <span class="font-mono text-slate-200">{{ t.entry_price }} → {{ t.exit_price }}</span></div>
            <div>시간: <span class="font-mono text-slate-200">{{ t.created_at.slice(0, 19) }}</span></div>
            <div>ID: <span class="font-mono text-slate-200">#{{ t.id }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const trades = ref<any[]>([])
const data = await $fetch<any>('/api/account')
trades.value = data.trades
</script>

