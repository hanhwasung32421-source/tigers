<template>
  <div class="space-y-6">
    <HeaderTabs active="balance" />

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="font-semibold">잔액</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">가상 USDT</div>
          <div class="mt-1 font-mono text-2xl">{{ balance.toFixed(2) }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">오픈 포지션</div>
          <div class="mt-1 font-mono text-2xl">{{ positions.length }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">거래 내역</div>
          <div class="mt-1 font-mono text-2xl">{{ trades.length }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const balance = ref(0)
const positions = ref<any[]>([])
const trades = ref<any[]>([])

const data = await $fetch<any>('/api/account')
balance.value = data.balance.usdt
positions.value = data.positions
trades.value = data.trades
</script>

<script lang="ts">
export default {}
</script>

