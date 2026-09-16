<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">{{ t('수익/손실 인증', 'Profit/Loss Proof') }}</h1>
      <p class="mt-2 text-sm text-slate-400">
        {{ t('거래 결과를 카드 형태로 저장해 "수익 인증 / 손실 인증"으로 남길 수 있습니다.', 'Save your trade results as a card to keep as "profit proof / loss proof".') }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 class="font-semibold">{{ t('최근 거래에서 카드 만들기', 'Create Card from Recent Trades') }}</h2>
        <div class="mt-3 space-y-2">
          <div v-if="trades.length === 0" class="text-sm text-slate-400">{{ t('거래 내역이 없습니다.', 'No trade history available.') }}</div>
          <div v-for="tr in trades" :key="tr.id" class="rounded-xl bg-black/20 p-4 text-sm">
            <div class="flex justify-between">
              <div class="font-medium">
                #{{ tr.id }} · {{ tr.symbol }} · {{ tr.side.toUpperCase() }} · x{{ tr.leverage }}
              </div>
              <div class="font-mono" :class="tr.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ tr.pnl >= 0 ? '+' : '' }}{{ Number(tr.pnl).toFixed(2) }} USDT
              </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <input
                v-model.trim="titleByTrade[tr.id]"
                class="w-56 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                :placeholder="t('카드 제목(예: 6/12 BTC 수익)', 'Card title (e.g. 6/12 BTC profit)')"
                :key="`card-title-${locale}-${tr.id}`"
              />
              <button class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400" @click="createCard(tr.id)">
                {{ t('카드 생성', 'Create Card') }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-end justify-between">
          <h2 class="font-semibold">{{ t('내 인증 카드', 'My Proof Cards') }}</h2>
          <button class="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15" @click="load">{{ t('새로고침', 'Refresh') }}</button>
        </div>
        <div class="mt-3 grid gap-3">
          <div v-if="cards.length === 0" class="text-sm text-slate-400">{{ t('아직 카드가 없습니다.', 'No cards yet.') }}</div>
          <div v-for="c in cards" :key="c.id" class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm text-slate-400">{{ t('인증 카드', 'Proof Card') }}</div>
                <div class="mt-1 text-lg font-semibold">{{ c.title }}</div>
                <div class="mt-1 text-xs text-slate-400 font-mono">#{{ c.id }} · {{ c.created_at.slice(0, 19) }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-400">{{ c.symbol }} · {{ c.side.toUpperCase() }}</div>
                <div class="mt-1 font-mono text-xl" :class="c.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ c.pnl >= 0 ? '+' : '' }}{{ Number(c.pnl).toFixed(2) }} USDT
                </div>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>{{ t('수량', 'Qty') }}: <span class="font-mono text-slate-200">{{ c.qty }}</span></div>
              <div>{{ t('진입/청산', 'Entry/Exit') }}: <span class="font-mono text-slate-200">{{ c.entry_price }} → {{ c.exit_price }}</span></div>
            </div>
            <div v-if="c.note" class="mt-3 text-sm text-slate-300">{{ c.note }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { t, locale } = useLocale()
const trades = ref<any[]>([])
const cards = ref<any[]>([])
const titleByTrade = reactive<Record<number, string>>({})
const error = ref<string | null>(null)

async function load() {
  error.value = null
  // SSR(주소창 직접 접속/새로고침)에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
  // 로그인 상태인데도 /api/account가 401로 실패하는 문제를 막을 수 있다.
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const data = await $fetch<any>('/api/account', { headers, credentials: 'include' })
  trades.value = data.trades
  cards.value = data.cards
}

async function createCard(tradeId: number) {
  try {
    const title = (titleByTrade[tradeId] || '').trim() || t(`거래 #${tradeId} 인증`, `Trade #${tradeId} Proof`)
    await $fetch('/api/profit/create', { method: 'POST', body: { tradeId, title } })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('카드 생성 실패', 'Failed to create card')
  }
}

await load()
</script>
