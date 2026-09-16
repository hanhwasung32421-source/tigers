<template>
  <div class="space-y-6">
    <HeaderTabs active="balance" />

    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <h2 class="font-semibold">{{ t('잔액', 'Balance') }}</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl bg-[#031019] p-4 ring-1 ring-cyan-500/10">
          <div class="text-xs text-slate-400">{{ t('가상 USDT', 'Virtual USDT') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ balance.toFixed(2) }}</div>
        </div>
        <div class="rounded-xl bg-[#031019] p-4 ring-1 ring-cyan-500/10">
          <div class="text-xs text-slate-400">{{ t('오픈 포지션', 'Open Positions') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ positions.length }}</div>
        </div>
        <div class="rounded-xl bg-[#031019] p-4 ring-1 ring-cyan-500/10">
          <div class="text-xs text-slate-400">{{ t('거래 내역', 'Trade History') }}</div>
          <div class="mt-1 font-mono text-2xl">{{ trades.length }}</div>
        </div>
      </div>
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
const data = await $fetch<any>('/api/account', { headers, credentials: 'include' })
balance.value = data.balance.usdt
positions.value = data.positions
trades.value = data.trades
</script>

<script lang="ts">
export default {}
</script>
