<template>
  <div class="font-landing pb-10">
    <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <!-- 왼쪽: 소개 + 통화/코인 -->
      <div>
        <h1 class="text-[32px] font-bold leading-[1.25] tracking-tight text-white md:text-[40px]">
          {{ t('은행 입금으로 지금 바로', 'Start Buying/Selling Crypto') }}<br />
          {{ t('암호화폐를 사고파세요', 'with Bank Transfer Now') }}
        </h1>
        <p class="mt-5 text-[15px] leading-6 text-slate-300">
          <BrandText :text="t(`${appName}에서 원화로 간편하게 USDT를 구매하고 판매할 수 있습니다.`, `${appName} lets you easily buy and sell USDT with Korean won.`)" /><br />
          {{ t('요청을 접수하면 고객센터에서 입금/출금을 확인하고 처리해 드립니다.', 'Submit a request and our support team will confirm and process your deposit or withdrawal.') }}
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-2">
          <div class="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-4">
            <span class="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.08] text-slate-200">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />
              </svg>
            </span>
            <span class="text-[17px] font-semibold text-white">{{ t('은행 입금/출금', 'Bank Transfer') }}</span>
          </div>
          <div class="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-4">
            <span class="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.08] text-slate-200">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18M7 15h3" />
              </svg>
            </span>
            <span class="text-[17px] font-semibold text-white">{{ t('계좌번호 확인', 'Account Number') }}</span>
          </div>
        </div>

        <h2 class="mt-10 text-[19px] font-bold text-white">{{ t('인기 법정화폐', 'Popular Fiat Currencies') }}</h2>
        <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div
            v-for="f in fiats"
            :key="f.code"
            class="flex items-center gap-2.5 rounded-xl px-3 py-3"
            :class="f.code === 'KRW' ? 'bg-[#f0b90b]/15 ring-1 ring-[#f0b90b]' : 'bg-white/[0.04]'"
          >
            <img :src="flagUrl(f.cc)" :alt="f.code" class="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" />
            <span class="min-w-0 leading-tight">
              <span class="block text-[15px] font-bold text-white">{{ f.code }}</span>
              <span class="block truncate text-[11px] text-slate-400">{{ f.name }}</span>
            </span>
          </div>
        </div>

        <h2 class="mt-10 text-[19px] font-bold text-white">{{ t('인기 암호화폐', 'Popular Cryptocurrencies') }}</h2>
        <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div v-for="c in cryptos" :key="c" class="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-3">
            <CoinIcon :base="c" :size="26" />
            <span class="text-[15px] font-bold text-white">{{ c }}</span>
          </div>
        </div>
      </div>

      <!-- 오른쪽: 구매/판매 카드 -->
      <div class="overflow-hidden rounded-3xl border border-white/10">
        <div class="grid grid-cols-2 text-[22px] font-bold">
          <button type="button" class="py-5 transition" :class="mode === 'buy' ? 'text-white' : 'bg-white/[0.05] text-slate-500 hover:text-slate-300'" @click="switchMode('buy')">
            {{ t('구매', 'Buy') }}
          </button>
          <button type="button" class="py-5 transition" :class="mode === 'sell' ? 'text-white' : 'bg-white/[0.05] text-slate-500 hover:text-slate-300'" @click="switchMode('sell')">
            {{ t('판매', 'Sell') }}
          </button>
        </div>

        <div class="space-y-4 p-5 pt-6">
          <!-- 지불 / 판매 -->
          <div class="rounded-2xl border border-white/10 px-4 py-3">
            <div class="text-[13px] text-slate-300">{{ mode === 'buy' ? t('지불 금액', 'You Pay') : t('판매 수량', 'You Sell') }}</div>
            <div class="mt-1 flex items-center justify-between gap-3">
              <input
                :key="`pay-${mode}-${locale}`"
                :value="payInput"
                type="text"
                inputmode="decimal"
                :placeholder="mode === 'buy' ? t('금액 입력', 'Enter amount') : t('수량 입력', 'Enter quantity')"
                class="w-full min-w-0 bg-transparent text-[24px] text-white outline-none placeholder:text-slate-500"
                @input="onPayInput(($event.target as HTMLInputElement).value)"
              />
              <span class="flex shrink-0 items-center gap-2 text-[16px] font-bold text-white">
                <template v-if="mode === 'buy'"><img :src="flagUrl('kr')" alt="KRW" class="h-5 w-5 rounded-full object-cover" />KRW</template>
                <template v-else><CoinIcon base="USDT" :size="22" />USDT</template>
              </span>
            </div>
            <div v-if="mode === 'buy' && locale === 'ko' && krwText" class="mt-1 text-xs text-slate-400">{{ krwText }}</div>
          </div>

          <!-- 받는 금액 -->
          <div class="rounded-2xl border border-white/10 px-4 py-3">
            <div class="text-[13px] text-slate-300">{{ t('받는 금액', 'You Will Receive') }}</div>
            <div class="mt-1 flex items-center justify-between gap-3">
              <div class="min-w-0 truncate text-[24px] text-white">{{ receiveText }}</div>
              <span class="flex shrink-0 items-center gap-2 text-[16px] font-bold text-white">
                <template v-if="mode === 'buy'"><CoinIcon base="USDT" :size="22" />USDT</template>
                <template v-else><img :src="flagUrl('kr')" alt="KRW" class="h-5 w-5 rounded-full object-cover" />KRW</template>
              </span>
            </div>
          </div>

          <div class="text-[14px] text-slate-300">
            {{ t('예상 가격', 'Estimated Price') }} <span class="text-white">1 USDT ≈ {{ rate > 0 ? Math.round(rate).toLocaleString('en-US') : '—' }} KRW</span>
          </div>

          <button
            type="button"
            class="w-full rounded-lg bg-[#f0b90b] py-4 text-[20px] font-medium text-[#383A3E] hover:bg-[#d9a609] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
            @click="onSubmit"
          >
            {{ buttonLabel }}
          </button>
          <p class="text-[13px] text-slate-400">{{ t('요청은 고객센터에서 확인 후 처리됩니다.', 'Requests are confirmed and processed by our support team.') }}</p>
        </div>
      </div>
    </div>

    <!-- 요청 완료 안내 -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4" @click.self="showModal = false">
        <div class="relative w-full max-w-sm rounded-2xl border border-cyan-500/15 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <button type="button" class="absolute right-4 top-4 text-slate-400 hover:text-white" :aria-label="t('닫기', 'Close')" @click="showModal = false">✕</button>
          <h2 class="pr-6 text-lg font-semibold text-slate-100">
            {{ doneKind === 'sell' ? t('출금요청되었습니다.', 'Your withdrawal request has been submitted.') : t('입금요청되었습니다.', 'Your deposit request has been submitted.') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">{{ t('고객센터로 텔레그램 남겨주세요.', 'Please message us on Telegram support.') }}</p>
          <button
            v-if="telegramUrl"
            type="button"
            class="mt-5 w-full rounded-md bg-[#229ed9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c8ec4]"
            @click="openTelegram"
          >
            {{ t('고객센터 문의하기', 'Contact Support') }}
          </button>
          <NuxtLink to="/wallet" class="mt-3 block w-full rounded-md bg-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-white/20">
            {{ t('내 지갑으로 이동', 'Go to My Wallet') }}
          </NuxtLink>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useLocale()
const { me } = useMe()
const appName = useRuntimeConfig().public.appName as string

const fiats = [
  { code: 'KRW', name: 'South Korean Won', cc: 'kr' },
  { code: 'USD', name: 'US Dollar', cc: 'us' },
  { code: 'EUR', name: 'Euro', cc: 'eu' },
  { code: 'JPY', name: 'Japanese Yen', cc: 'jp' },
  { code: 'HKD', name: 'Hong Kong Dollar', cc: 'hk' },
  { code: 'AUD', name: 'Australian Dollar', cc: 'au' },
  { code: 'CHF', name: 'Swiss Franc', cc: 'ch' },
  { code: 'SGD', name: 'Singapore Dollar', cc: 'sg' }
]
// 국기 이미지(윈도우 크롬은 국기 이모지를 그리지 못해서 이미지로 쓴다)
function flagUrl(cc: string) {
  return `https://flagcdn.com/w40/${cc}.png`
}
const cryptos = ['USDT', 'BTC', 'ETH', 'XRP', 'LINK', 'LTC', 'SOL', 'DOGE']

// 환율(원/USDT): 로그인 없이도 미리보기 금액이 보이도록 공개 엔드포인트를 쓴다.
const { data: rateData } = await useFetch<{ rate: number }>('/api/settings/krw-rate-public')
const rate = computed(() => Number(rateData.value?.rate || 0))

const mode = ref<'buy' | 'sell'>('buy')
const payInput = ref('')
const submitting = ref(false)
const showModal = ref(false)
const doneKind = ref<'buy' | 'sell'>('buy')
const telegramUrl = ref('')

onMounted(async () => {
  try {
    const settings = await $fetch<any>('/api/settings/telegram')
    telegramUrl.value = String(settings?.telegramUrl || '')
  } catch {
    telegramUrl.value = ''
  }
})

function switchMode(m: 'buy' | 'sell') {
  if (mode.value === m) return
  mode.value = m
  payInput.value = ''
}

// 입력값: 구매는 원화(정수, 천단위 콤마), 판매는 USDT(소수 허용)
function onPayInput(raw: string) {
  if (mode.value === 'buy') {
    const digits = raw.replace(/[^\d]/g, '')
    payInput.value = digits ? Number(digits).toLocaleString('en-US') : ''
  } else {
    const cleaned = raw.replace(/[^\d.]/g, '')
    const [i, ...rest] = cleaned.split('.')
    payInput.value = rest.length ? `${i}.${rest.join('').slice(0, 6)}` : i
  }
}
const payNumber = computed(() => {
  const n = Number(String(payInput.value || '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
})

const receiveText = computed(() => {
  if (!(payNumber.value > 0) || !(rate.value > 0)) return '—'
  if (mode.value === 'buy') return (payNumber.value / rate.value).toFixed(6)
  return Math.round(payNumber.value * rate.value).toLocaleString('en-US')
})

// "1,234만원" 같은 한글식 금액(원화 구매일 때 한국어 화면에서만)
const krwText = computed(() => {
  const n = payNumber.value
  if (!(n > 0)) return ''
  const units: Array<[number, string]> = [
    [1e12, '조'],
    [1e8, '억'],
    [1e4, '만']
  ]
  let remain = Math.floor(n)
  const parts: string[] = []
  for (const [u, label] of units) {
    const c = Math.floor(remain / u)
    if (c > 0) {
      parts.push(`${c.toLocaleString()}${label}`)
      remain -= c * u
    }
  }
  if (remain > 0) parts.push(remain.toLocaleString())
  return parts.length ? `${parts.join(' ')}원` : ''
})

const buttonLabel = computed(() => {
  if (!me.value) return t('지금 로그인', 'Log In Now')
  return mode.value === 'buy' ? t('구매요청', 'Request Purchase') : t('출금요청', 'Request Withdrawal')
})

function openTelegram() {
  if (telegramUrl.value) window.open(telegramUrl.value, '_blank', 'noopener')
}

// 로그인 전: 로그인 화면으로 / 로그인 후: 내 지갑의 입금요청(구매) 또는 출금요청(판매)을 바로 접수
async function onSubmit() {
  if (!me.value) {
    await navigateTo('/auth/login')
    return
  }
  if (submitting.value) return
  if (!(payNumber.value > 0)) {
    alert(mode.value === 'buy' ? t('지불할 금액을 입력해 주세요.', 'Please enter the amount to pay.') : t('판매할 수량을 입력해 주세요.', 'Please enter the quantity to sell.'))
    return
  }
  if (!(rate.value > 0)) {
    alert(t('환율을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.', 'Unable to get the exchange rate. Please try again shortly.'))
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'buy') {
      await $fetch('/api/wallet/deposit-request', { method: 'POST', body: { krwAmount: Math.round(payNumber.value) } })
    } else {
      await $fetch('/api/wallet/withdraw-request', { method: 'POST', body: { krwAmount: Math.round(payNumber.value * rate.value) } })
    }
    doneKind.value = mode.value
    payInput.value = ''
    showModal.value = true
  } catch (e: any) {
    alert(
      e?.data?.statusMessage ||
        (mode.value === 'buy' ? t('입금요청 중 오류가 발생했습니다.', 'An error occurred while requesting a deposit.') : t('출금요청 중 오류가 발생했습니다.', 'An error occurred while requesting a withdrawal.'))
    )
  } finally {
    submitting.value = false
  }
}

</script>
