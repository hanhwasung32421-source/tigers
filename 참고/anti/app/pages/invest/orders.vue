<template>
  <div class="space-y-6">
    <HeaderTabs active="orders" />

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="font-semibold">선물 주문 내역</h2>
      <p class="mt-2 text-sm text-slate-400">현재 선물 계정에서 실시간으로 진입한 주문 및 오픈 포지션 내역입니다.</p>

      <div class="mt-4 overflow-auto">
        <table class="w-full text-xs">
          <thead class="text-slate-400">
            <tr class="text-left">
              <th class="py-2">코인</th>
              <th class="py-2">포지션</th>
              <th class="py-2">수량</th>
              <th class="py-2">진입가격</th>
              <th class="py-2">증거금</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="positions.length === 0" class="border-t border-white/10">
              <td colspan="5" class="py-3 text-slate-400">데이터가 없습니다.</td>
            </tr>
            <tr v-for="p in positions" :key="p.id" class="border-t border-white/10">
              <td class="py-2 font-mono">{{ p.symbol }}</td>
              <td class="py-2" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">
                {{ p.side.toUpperCase() }} x{{ p.leverage }}
              </td>
              <td class="py-2 font-mono">{{ Number(p.qty).toFixed(6) }}</td>
              <td class="py-2 font-mono">{{ Number(p.entry_price).toFixed(2) }}</td>
              <td class="py-2 font-mono">{{ Number(p.margin).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const positions = ref<any[]>([])
const data = await $fetch<any>('/api/account')
positions.value = data.positions
</script>

