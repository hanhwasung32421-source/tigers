<template>
  <div class="space-y-6">
    <HeaderTabs active="trades" />

    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <h2 class="font-semibold">{{ t('선물 거래 내역', 'Futures Trade History') }}</h2>
      <p class="mt-2 text-sm text-slate-400">{{ t('청산된 거래(손익 포함) 내역입니다.', 'History of closed trades, including profit/loss.') }}</p>

      <div class="mt-4 space-y-2">
        <div v-if="trades.length === 0" class="text-sm text-slate-400">{{ t('거래 내역이 없습니다.', 'No trade history available.') }}</div>
        <div v-for="tr in trades" :key="tr.id" class="rounded-xl bg-[#031019] p-4 text-sm ring-1 ring-cyan-500/10">
          <div class="flex justify-between">
            <div class="flex items-center gap-2 font-medium">
              <span>{{ tr.symbol }} · {{ tr.side.toUpperCase() }} · x{{ tr.leverage }}</span>
              <span
                class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                :class="tradeResultBadgeClass(tr)"
              >
                {{ tradeResultLabel(tr) }}
              </span>
            </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const { t } = useLocale()
const trades = ref<any[]>([])
// SSR(주소창 직접 접속/새로고침)에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
// 로그인 상태인데도 /api/account가 401로 실패하는 문제를 막을 수 있다.
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const data = await $fetch<any>('/api/account', { headers, credentials: 'include' })
trades.value = data.trades

function tradeResultLabel(tr: any) {
  if (Boolean(tr?.liquidation)) return t('강제청산', 'Liquidated')
  return Number(tr?.pnl || 0) >= 0 ? t('수익', 'Profit') : t('손실', 'Loss')
}

function tradeResultBadgeClass(tr: any) {
  if (Boolean(tr?.liquidation)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(tr?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}
</script>
