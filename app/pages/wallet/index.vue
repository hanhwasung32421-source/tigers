<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <h1 class="text-xl font-semibold">내 지갑</h1>
      <p class="mt-2 text-sm text-slate-400">보유 USDT 잔고와 자산 정보를 확인할 수 있습니다.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">USDT 잔고</div>
        <div class="mt-1 font-mono text-2xl">{{ balance.toFixed(2) }}</div>
      </div>
      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">가상 입금</div>
        <div class="mt-1 text-sm text-slate-200">관리자 페이지에서 유저에게 USDT 입금 처리</div>
      </div>
      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">출금</div>
        <div class="mt-1 text-sm text-slate-200">준비중</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const balance = ref(0)
const data = await $fetch<any>('/api/account')
balance.value = data.balance.usdt
</script>
