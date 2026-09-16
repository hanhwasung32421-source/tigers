<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ t('내 지갑', 'My Wallet') }}</h1>
          <p class="mt-2 text-sm text-slate-400">{{ t('보유 USDT 잔고와 자산 정보를 확인할 수 있습니다.', 'Check your USDT balance and asset information.') }}</p>
        </div>
        <button
          v-if="telegramUrl"
          type="button"
          class="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
          :title="t('고객센터 텔레그램', 'Support Telegram')"
          @click="openTelegram"
        >
          <TelegramIcon class="h-5 w-5" />
          <span class="hidden sm:inline">{{ t('고객센터', 'Support') }}</span>
        </button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">{{ t('USDT 잔고', 'USDT Balance') }}</div>
        <div class="mt-1 font-mono text-2xl">{{ fmtKrw(balance) }}</div>
        <div class="mt-0.5 font-mono text-sm text-slate-400">{{ balance.toFixed(2) }} USDT</div>
      </div>

      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">{{ t('입금요청 (원화)', 'Deposit Request (KRW)') }}</div>
        <div class="mt-2 flex items-center gap-2">
          <input
            :key="`deposit-input-${locale}`"
            :value="krwInput"
            type="text"
            inputmode="numeric"
            :placeholder="t('입금할 금액(원)', 'Amount to deposit (KRW)')"
            class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
            @input="onKrwInput('deposit', ($event.target as HTMLInputElement).value)"
          />
          <span class="whitespace-nowrap text-sm text-slate-400">{{ t('원', 'KRW') }}</span>
        </div>
        <div class="mt-1 text-xs text-slate-500">≈ {{ usdtPreview(krwInput) }} USDT</div>
        <div v-if="locale === 'ko' && krwToKoreanText(krwInput)" class="mt-0.5 text-xs text-cyan-300">{{ krwToKoreanText(krwInput) }}</div>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            v-for="q in QUICK_KRW_AMOUNTS"
            :key="q.value"
            type="button"
            class="rounded-md bg-white/5 px-2 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
            @click="addDepositAmount(q.value)"
          >
            {{ t(q.label, q.labelEn) }}
          </button>
        </div>
        <button
          type="button"
          class="mt-3 w-full rounded-md bg-[#1d4ed8] px-3 py-2 text-sm font-medium text-white hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmitDeposit || submittingDeposit"
          @click="submitDepositRequest"
        >
          {{ t('입금요청', 'Request Deposit') }}
        </button>
      </div>

      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">{{ t('출금요청 (원화)', 'Withdrawal Request (KRW)') }}</div>
        <div class="mt-2 flex items-center gap-2">
          <input
            :key="`withdraw-input-${locale}`"
            :value="krwWithdrawInput"
            type="text"
            inputmode="numeric"
            :placeholder="t('출금할 금액(원)', 'Amount to withdraw (KRW)')"
            class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
            @input="onKrwInput('withdraw', ($event.target as HTMLInputElement).value)"
          />
          <span class="whitespace-nowrap text-sm text-slate-400">{{ t('원', 'KRW') }}</span>
        </div>
        <div class="mt-1 text-xs text-slate-500">≈ {{ usdtPreview(krwWithdrawInput) }} USDT</div>
        <div v-if="locale === 'ko' && krwToKoreanText(krwWithdrawInput)" class="mt-0.5 text-xs text-cyan-300">{{ krwToKoreanText(krwWithdrawInput) }}</div>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            v-for="q in QUICK_KRW_AMOUNTS"
            :key="q.value"
            type="button"
            class="rounded-md bg-white/5 px-2 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
            @click="addWithdrawAmount(q.value)"
          >
            {{ t(q.label, q.labelEn) }}
          </button>
        </div>
        <button
          type="button"
          class="mt-3 w-full rounded-md bg-[#1d4ed8] px-3 py-2 text-sm font-medium text-white hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmitWithdraw || submittingWithdraw"
          @click="submitWithdrawRequest"
        >
          {{ t('출금요청', 'Request Withdrawal') }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4"
        @click.self="showModal = false"
      >
        <div class="relative w-full max-w-sm rounded-2xl border border-cyan-500/15 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            class="absolute right-4 top-4 text-slate-400 hover:text-white"
            :aria-label="t('닫기', 'Close')"
            @click="showModal = false"
          >
            ✕
          </button>
          <h2 class="pr-6 text-lg font-semibold text-slate-100">
            {{ modalKind === 'withdraw' ? t('출금요청되었습니다.', 'Your withdrawal request has been submitted.') : t('입금요청되었습니다.', 'Your deposit request has been submitted.') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">{{ t('고객센터로 텔레그램 남겨주세요.', 'Please message us on Telegram support.') }}</p>
          <button
            type="button"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#229ed9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c8ec4]"
            @click="contactSupport"
          >
            <TelegramIcon class="h-5 w-5" />
            {{ t('고객센터 문의하기', 'Contact Support') }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const { t, locale } = useLocale()

const TelegramIcon = {
  props: { class: { type: String, default: '' } },
  template: `
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" :class="class">
      <circle cx="120" cy="120" r="120" fill="#229ED9" />
      <path
        d="M167.5 72.5L145.7 178.4c-1.6 7.3-6 9.1-12.1 5.7l-33.5-24.7-16.2 15.6c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-33.9 61.8-55.9c2.7-2.4-.6-3.7-4.2-1.3l-76.4 48.1-32.9-10.3c-7.2-2.2-7.3-7.2 1.5-10.7l128.5-49.5c6-2.2 11.2 1.4 9.3 10.3z"
        fill="#fff"
      />
    </svg>
  `
}

const balance = ref(0)
const krwInput = ref('')
const krwWithdrawInput = ref('')
const submittingDeposit = ref(false)
const submittingWithdraw = ref(false)
const showModal = ref(false)
const modalKind = ref<'deposit' | 'withdraw'>('deposit')
const telegramUrl = ref('')
const krwPerUsdt = ref(0)

// SSR(주소창 직접 접속/새로고침)에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
// 로그인 상태인데도 /api/account가 401로 실패하는 문제를 막을 수 있다.
const accountHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const data = await $fetch<any>('/api/account', { headers: accountHeaders, credentials: 'include' })
balance.value = data.balance.usdt

try {
  const settings = await $fetch<any>('/api/settings/telegram')
  telegramUrl.value = String(settings?.telegramUrl || '')
} catch {
  telegramUrl.value = ''
}

try {
  const rateData = await $fetch<any>('/api/settings/krw-rate')
  krwPerUsdt.value = Number(rateData?.rate || 0)
} catch {
  krwPerUsdt.value = 0
}

function fmtKrw(usdtValue: number) {
  const amount = Math.round(Number(usdtValue || 0) * krwPerUsdt.value).toLocaleString()
  return t(`${amount}원`, `${amount} KRW`)
}

// 입력칸 표시값(콤마 포함)에서 순수 숫자만 뽑아낸다.
function parseKrw(value: string): number {
  const digits = String(value || '').replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

// 입력칸에 직접 타이핑할 때 1,000,000 처럼 천단위 콤마를 자동으로 붙여준다.
function formatKrwDisplay(value: string): string {
  const n = parseKrw(value)
  return n > 0 ? n.toLocaleString('en-US') : ''
}

function onKrwInput(field: 'deposit' | 'withdraw', raw: string) {
  const formatted = formatKrwDisplay(raw)
  if (field === 'deposit') krwInput.value = formatted
  else krwWithdrawInput.value = formatted
}

function usdtPreview(krwValue: string) {
  const krw = parseKrw(krwValue)
  if (!(krw > 0) || !(krwPerUsdt.value > 0)) return '0.00'
  return (krw / krwPerUsdt.value).toFixed(2)
}

// 조/억/만 단위로 끊어서 "1,234만원" 같은 한글식 금액 표기를 만든다.
function krwToKoreanText(krwValue: string) {
  const n = parseKrw(krwValue)
  if (!Number.isFinite(n) || n <= 0) return ''
  const units: Array<[number, string]> = [
    [1e12, '조'],
    [1e8, '억'],
    [1e4, '만']
  ]
  let remain = n
  const parts: string[] = []
  for (const [unitValue, label] of units) {
    const count = Math.floor(remain / unitValue)
    if (count > 0) {
      parts.push(`${count.toLocaleString()}${label}`)
      remain -= count * unitValue
    }
  }
  if (remain > 0) parts.push(remain.toLocaleString())
  if (!parts.length) return ''
  return `${parts.join(' ')}원`
}

const QUICK_KRW_AMOUNTS = [
  { label: '100만원', labelEn: '1M KRW', value: 1_000_000 },
  { label: '1000만원', labelEn: '10M KRW', value: 10_000_000 },
  { label: '5000만원', labelEn: '50M KRW', value: 50_000_000 }
]

function addDepositAmount(amount: number) {
  const cur = parseKrw(krwInput.value)
  krwInput.value = (cur + amount).toLocaleString('en-US')
}

function addWithdrawAmount(amount: number) {
  const cur = parseKrw(krwWithdrawInput.value)
  krwWithdrawInput.value = (cur + amount).toLocaleString('en-US')
}

const canSubmitDeposit = computed(() => parseKrw(krwInput.value) > 0)
const canSubmitWithdraw = computed(() => parseKrw(krwWithdrawInput.value) > 0)

function openTelegram() {
  if (!telegramUrl.value) return
  window.open(telegramUrl.value, '_blank', 'noopener')
}

function contactSupport() {
  if (telegramUrl.value) {
    window.open(telegramUrl.value, '_blank', 'noopener')
  }
}

async function submitDepositRequest() {
  const krwAmount = parseKrw(krwInput.value)
  if (!(krwAmount > 0) || submittingDeposit.value) return
  submittingDeposit.value = true
  try {
    await $fetch('/api/wallet/deposit-request', {
      method: 'POST',
      body: { krwAmount }
    })
    krwInput.value = ''
    modalKind.value = 'deposit'
    showModal.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || t('입금요청 중 오류가 발생했습니다.', 'An error occurred while requesting a deposit.'))
  } finally {
    submittingDeposit.value = false
  }
}

async function submitWithdrawRequest() {
  const krwAmount = parseKrw(krwWithdrawInput.value)
  if (!(krwAmount > 0) || submittingWithdraw.value) return
  submittingWithdraw.value = true
  try {
    await $fetch('/api/wallet/withdraw-request', {
      method: 'POST',
      body: { krwAmount }
    })
    krwWithdrawInput.value = ''
    modalKind.value = 'withdraw'
    showModal.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || t('출금요청 중 오류가 발생했습니다.', 'An error occurred while requesting a withdrawal.'))
  } finally {
    submittingWithdraw.value = false
  }
}
</script>
