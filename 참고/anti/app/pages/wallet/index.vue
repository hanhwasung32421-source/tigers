<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">내 지갑</h1>
      <p class="mt-2 text-sm text-slate-400">선물 자산 잔고와 진입한 포지션을 모니터링할 수 있습니다.</p>
    </div>

    <!-- 잔고 카드 -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="text-sm text-slate-400">선물 계정 잔고 (USDT)</div>
        <div v-if="loading" class="mt-3 h-8 w-36 animate-pulse rounded bg-white/10"></div>
        <div v-else class="mt-1 font-mono text-3xl font-semibold text-indigo-400">{{ fmtPrice(balance) }} USDT</div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="text-sm text-slate-400">입금 서비스</div>
        <div class="mt-1 text-sm text-slate-200">USDT 입금은 관리자 또는 고객센터를 통해 입금 요청을 접수하실 수 있습니다.</div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="text-sm text-slate-400">출금 서비스</div>
        <div class="mt-1 text-sm text-slate-200">출금 서비스는 자산 관리 메뉴를 통해 신청 및 신속 승인이 가능합니다.</div>
      </div>
    </div>

    <!-- 잡은 포지션 현황 -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 class="text-base font-semibold mb-4">현재 포지션 현황</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="text-slate-400 border-b border-white/10">
            <tr class="text-left">
              <th class="py-2">심볼</th>
              <th class="py-2">구분</th>
              <th class="py-2">레버리지</th>
              <th class="py-2">수량</th>
              <th class="py-2">진입가격</th>
              <th class="py-2">증거금</th>
              <th class="py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="border-t border-white/10">
              <td colspan="7" class="py-6 text-center text-slate-400">
                <div class="flex items-center justify-center gap-2">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                  <span>지갑 정보를 불러오는 중...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="positions.length === 0" class="border-t border-white/10">
              <td colspan="7" class="py-4 text-center text-slate-400">보유 중인 포지션이 없습니다.</td>
            </tr>
            <tr v-else v-for="p in positions" :key="p.id" class="border-t border-white/5 hover:bg-white/5 font-mono text-slate-300">
              <td class="py-3 font-bold">{{ formatSymbol(p.symbol) }}</td>
              <td class="py-3">
                <span class="rounded px-1.5 py-0.5 text-[10px] ring-1"
                  :class="p.side === 'long' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30' : 'bg-rose-500/10 text-rose-300 ring-rose-400/30'">
                  {{ p.side === 'long' ? 'LONG' : 'SHORT' }}
                </span>
              </td>
              <td class="py-3">x{{ p.leverage }}</td>
              <td class="py-3">{{ fmtQty(p.symbol, p.qty) }}</td>
              <td class="py-3">{{ fmtPrice(p.entry_price) }}</td>
              <td class="py-3">{{ Number(p.margin).toFixed(2) }} USDT</td>
              <td class="py-3">
                <button 
                  class="rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-2.5 py-1 border border-rose-500/20 transition text-[11px]"
                  @click="closePosition(p.id)"
                >
                  시장가 청산
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const balance = ref(0)
const positions = ref<any[]>([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/account')
    balance.value = data.balance?.usdt ?? 0
    positions.value = data.positions || []
  } catch (e) {
    console.error('Failed to load account data:', e)
  } finally {
    loading.value = false
  }
}

async function closePosition(positionId: number) {
  if (!confirm('정말 시장가로 청산하시겠습니까?')) return
  try {
    await $fetch('/api/trade/close', {
      method: 'POST',
      body: { positionId }
    })
    await loadData()
  } catch (e: any) {
    alert(e?.data?.statusMessage || '청산 실패')
  }
}

function formatSymbol(sym: string) {
  if (!sym) return ''
  return sym.replace('-USDT-SWAP', '').replace('USDT', '') + '/USDT'
}

function fmtQty(sym: string, qty: number) {
  const s = String(sym || '').toUpperCase()
  if (s.startsWith('DOGE')) return Number(qty).toFixed(2)
  return Number(qty).toFixed(6)
}

function fmtPrice(v: number) {
  if (!Number.isFinite(v)) return '—'
  const digits = v < 1 ? 6 : 2
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

onMounted(() => {
  loadData()
})
</script>
