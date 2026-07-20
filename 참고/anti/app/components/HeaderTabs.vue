<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">투자내역</h1>
        <p class="mt-1 text-sm text-slate-400">첨부 화면에 맞춰 탭 구조로 구성했습니다. (추후 동일 UI로 디테일 수정)</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-sm">
      <NuxtLink
        to="/invest/balance"
        class="rounded-md px-3 py-2 ring-1"
        :class="active === 'balance' ? 'bg-white/10 ring-white/20' : 'bg-black/10 ring-white/10 hover:bg-white/10'"
      >
        잔액
      </NuxtLink>
      <NuxtLink
        to="/invest/orders"
        class="rounded-md px-3 py-2 ring-1"
        :class="active === 'orders' ? 'bg-white/10 ring-white/20' : 'bg-black/10 ring-white/10 hover:bg-white/10'"
      >
        선물 주문 내역
      </NuxtLink>
      <NuxtLink
        to="/invest/trades"
        class="rounded-md px-3 py-2 ring-1"
        :class="active === 'trades' ? 'bg-white/10 ring-white/20' : 'bg-black/10 ring-white/10 hover:bg-white/10'"
      >
        선물 거래 내역
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ active: 'balance' | 'orders' | 'trades' }>()
</script>

