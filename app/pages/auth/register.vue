<template>
  <div class="mx-auto max-w-xl">
    <h1 class="text-xl font-semibold">{{ t('회원가입', 'Sign Up') }}</h1>
    <p class="mt-1 text-sm text-slate-400">{{ t('필수 정보를 입력해서 계정을 만드세요.', 'Fill in the required information to create your account.') }}</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">{{ t('아이디', 'Username') }}<span class="text-rose-400">*</span></label>
        <input
          v-model.trim="username"
          inputmode="latin"
          autocomplete="off"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
        />
        <p v-if="username && !usernameValid" class="mt-1 text-xs text-rose-400">{{ t('한글은 사용할 수 없습니다', 'Korean characters are not allowed') }}</p>
      </div>

      <div>
        <label class="text-sm text-slate-300">{{ t('이름', 'Name') }}<span class="text-rose-400">*</span></label>
        <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        <p v-if="name && !nameValid" class="mt-1 text-xs text-rose-400">{{ t('한국어만 사용 가능합니다', 'Only Korean characters are allowed') }}</p>
      </div>

      <div>
        <div class="flex items-center justify-between gap-2">
          <label class="text-sm text-slate-300">{{ t('생년월일 yyyy-mm-dd', 'Date of Birth YYYY-MM-DD') }}<span class="text-rose-400">*</span></label>
          <span v-if="birthDate && !birthDateValid" class="text-xs text-rose-400">{{ t('날짜가 정확하지 않습니다.', 'The date is not valid.') }}</span>
        </div>
        <input
          v-model="birthDate"
          inputmode="numeric"
          placeholder="YYYY-MM-DD"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          @input="onBirthInput"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">{{ t('비밀번호', 'Password') }}<span class="text-rose-400">*</span></label>
          <input
            :value="password"
            type="password"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            @input="onPasswordInput"
          />
          <p v-if="password && password.length < 4" class="mt-1 text-xs text-rose-400">{{ t('비밀번호는 4글자 이상만 가능합니다', 'Password must be at least 4 characters') }}</p>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('비밀번호확인', 'Confirm Password') }}<span class="text-rose-400">*</span></label>
          <input
            :value="passwordConfirm"
            type="password"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            @input="onPasswordConfirmInput"
          />
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">{{ t('은행계좌', 'Bank Account') }}<span class="text-rose-400">*</span></label>
        <div class="mt-1 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            :key="`bank-account-${locale}`"
            v-model="bankAccount"
            inputmode="numeric"
            :placeholder="t('은행계좌', 'Bank Account')"
            class="w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
            @input="onBankAccountInput"
          />
          <select
            v-model="bankName"
            class="w-full rounded-lg bg-black/70 px-3 py-2 text-white outline-none ring-1 ring-white/20 focus:ring-indigo-500"
          >
            <option disabled value="" class="bg-black text-white">{{ t('선택(아래화살표)', 'Select (dropdown below)') }}</option>
            <option v-for="bank in banks" :key="bank.ko" :value="bank.ko" class="bg-black text-white">{{ t(bank.ko, bank.en) }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">{{ t('예금주', 'Account Holder') }}<span class="text-rose-400">*</span></label>
        <input
          :key="`account-holder-${locale}`"
          v-model.trim="accountHolder"
          :placeholder="t('예금주를 입력해 주세요', 'Enter the account holder name')"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
        />
        <p v-if="accountHolder && !accountHolderValid" class="mt-1 text-xs text-rose-400">{{ t('한국어만 사용 가능합니다', 'Only Korean characters are allowed') }}</p>
      </div>

      <div>
        <label class="text-sm text-slate-300">{{ t('추천코드', 'Referral Code') }}</label>
        <input v-model.trim="referralCode" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>

      <div class="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <label class="flex items-center gap-3 text-sm text-slate-200">
          <input v-model="agreedToTerms" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5" />
          <span>{{ t('약관에 동의합니다.', 'I agree to the Terms of Service.') }} <span class="text-rose-400">*</span></span>
          <button type="button" class="text-indigo-300 underline underline-offset-2 hover:text-indigo-200" @click="termsOpen = true">{{ t('이용약관', 'Terms of Service') }}</button>
        </label>
      </div>

      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="loading || !canSubmit"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        <span>{{ loading ? t('가입 처리 중...', 'Signing up...') : t('회원가입', 'Sign Up') }}</span>
      </button>
      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    </form>

    <div class="mt-5 text-center text-sm text-slate-400">
      <NuxtLink to="/auth/find-password" class="underline underline-offset-4 hover:text-indigo-300">{{ t('이미 계정이 있으신가요?', 'Already have an account?') }}</NuxtLink>
    </div>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="loading"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="w-[320px] rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/25 border-t-cyan-300" />
            <div>
              <div class="text-sm font-semibold text-slate-100">{{ t(loadingTitle, loadingTitleEn) }}</div>
              <div class="mt-1 text-xs text-slate-400">{{ t(loadingDesc, loadingDescEn) }}</div>
            </div>
          </div>
          <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div class="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-cyan-400/70" />
          </div>
        </div>
      </div>

      <div v-if="termsOpen" class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 px-4" @click.self="termsOpen = false">
        <div class="max-h-[78vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 class="text-base font-semibold text-slate-100">{{ t('이용약관', 'Terms of Service') }}</h2>
            <button type="button" class="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" @click="termsOpen = false">{{ t('닫기', 'Close') }}</button>
          </div>
          <div class="max-h-[60vh] overflow-auto px-5 py-4 text-[11px] leading-6 text-slate-400">
            <p v-for="(line, idx) in termsLines" :key="`terms-${idx}`" class="mb-3">{{ t(line, termsLinesEn[idx]) }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const { refresh } = useMe()
const route = useRoute()
const { t, locale } = useLocale()

const username = ref('')
const name = ref('')
const birthDate = ref('')
const password = ref('')
const passwordConfirm = ref('')
const bankAccount = ref('')
const bankName = ref('')
const accountHolder = ref('')
// 추천가입링크(?ref=코드)로 들어오면 추천코드를 미리 채워둔다
const referralCode = ref(String(route.query.ref || ''))
const agreedToTerms = ref(false)
const termsOpen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const loadingTitle = ref('가입 처리 중입니다...')
const loadingDesc = ref('계정을 만들고 있습니다.')
const loadingTitleEn = ref('Signing up...')
const loadingDescEn = ref('Creating your account.')

const banks = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]

const termsLines = [
  '본 약관은 회원가입 시 제공된 아이디, 이름, 생년월일, 은행계좌, 예금주, 추천코드 등의 정보를 회사가 서비스 운영과 법령상 의무 이행, 고객 응대, 이상 거래 탐지, 분쟁 대응, 내부 감사, 민원 처리 목적 범위 안에서 수집·보관·이용하는 내용 등을 포함합니다.',
  '회원정보는 관련 법령 및 내부 보관 기준에 따라 원칙적으로 서비스 종료 또는 탈퇴 요청 처리 후 지체 없이 파기하되, 거래 내역·정산 자료·민원 처리 기록과 같이 보존이 필요한 정보는 통상 1년 이상 분리 보관될 수 있으며, 관계 법령이 더 긴 기간을 요구하는 경우 그 기간 동안 보관될 수 있습니다.',
  '회원은 언제든지 정보 열람·수정·탈퇴를 요청할 수 있으나, 미정산 거래, 보안 점검, 본인 확인 미완료, 분쟁·조사 진행, 법령상 의무 보관 사유가 있는 경우 일부 요청은 즉시 처리되지 않을 수 있으며, 이 경우 회사는 처리 지연 사유를 합리적인 범위에서 안내할 수 있습니다.',
  '비밀번호 분실 등 보안 이슈가 발생한 경우 회사는 본인 확인을 위해 추가 자료를 요구할 수 있고, 운영자 승인 후 비밀번호를 초기화할 수 있으며, 초기화된 비밀번호는 회사가 정한 임시 기준으로 재설정된 뒤 회원이 즉시 변경해야 합니다.',
  '서비스 이용 과정에서 접속기록, IP, 브라우저 정보, 기기 정보, 거래 요청 기록 등 보안 관련 정보가 자동으로 수집될 수 있으며, 비정상 접근 또는 부정 이용 탐지 목적 범위 안에서 활용될 수 있습니다.',
  '회원은 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 되며, 허위 정보 기재로 인해 서비스 제한, 거래 취소, 계정 정지, 민형사상 책임이 발생할 수 있습니다. 회사는 서비스 안정성과 회원 보호를 위해 필요한 범위 안에서 본 약관을 개정할 수 있습니다.'
]
const termsLinesEn = [
  'These terms cover the collection, storage, and use of information provided at sign-up — username, name, date of birth, bank account, account holder, and referral code — for service operation, compliance with legal obligations, customer support, abnormal-transaction detection, dispute handling, internal audits, and complaint processing.',
  'Member information is, in principle, destroyed without delay after service termination or a withdrawal request under applicable law and internal retention standards, except that records requiring preservation (such as trade history, settlement records, and complaint records) may be kept separately for at least one year, or longer where required by law.',
  'Members may request to view, correct, or withdraw their information at any time; however, some requests may not be processed immediately in cases such as unsettled transactions, security review, incomplete identity verification, ongoing disputes or investigations, or legal retention requirements, in which case the Company may explain the reason for the delay within a reasonable scope.',
  'If a security issue such as a lost password occurs, the Company may request additional information for identity verification, and may reset the password after operator approval; the reset password is set to a temporary value determined by the Company and must be changed by the member immediately.',
  'Security-related information such as access logs, IP address, browser information, device information, and transaction request records may be automatically collected while using the service, and may be used within the scope of detecting abnormal access or fraudulent use.',
  'Members must not impersonate others or enter false information; doing so may result in service restriction, transaction cancellation, account suspension, and civil or criminal liability. The Company may revise these terms within the scope necessary for service stability and member protection.'
]

const birthDateValid = computed(() => {
  const v = birthDate.value.trim()
  if (!v) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map((n) => Number(n))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false
  if (y < 1900 || y > new Date().getFullYear()) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  const dt = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  const yy = dt.getUTCFullYear()
  const mm = dt.getUTCMonth() + 1
  const dd = dt.getUTCDate()
  return yy === y && mm === m && dd === d
})

const passwordsMatch = computed(() => String(password.value || '') === String(passwordConfirm.value || ''))

const usernameValid = computed(() => /^[A-Za-z0-9]+$/.test(username.value.trim()))
const nameValid = computed(() => /^[가-힣\s]+$/.test(name.value.trim()))
const accountHolderValid = computed(() => /^[가-힣\s]+$/.test(accountHolder.value.trim()))

const canSubmit = computed(() => {
  if (!username.value.trim()) return false
  if (!usernameValid.value) return false
  if (!name.value.trim()) return false
  if (!nameValid.value) return false
  if (!birthDateValid.value) return false
  if (!password.value) return false
  if (password.value.length < 4) return false
  if (!passwordConfirm.value) return false
  if (!passwordsMatch.value) return false
  if (!bankAccount.value.trim()) return false
  if (!bankName.value) return false
  if (!accountHolder.value.trim()) return false
  if (!accountHolderValid.value) return false
  if (!agreedToTerms.value) return false
  return true
})

function onBankAccountInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  const digits = raw.replace(/\D/g, '')
  bankAccount.value = digits
}

function onBirthInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const y = digits.slice(0, 4)
  const m = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  let out = y
  if (m) out += `-${m}`
  if (d) out += `-${d}`
  birthDate.value = out
}

// 2벌식 한글 입력을 영문 QWERTY로 변환 (예: ㅁㄴㅇ -> asd)
function hangulToQwerty(input: string) {
  const CHO = [
    'r', 'R', 's', 'e', 'E', 'f', 'a', 'q', 'Q', 't', 'T', 'd', 'w', 'W', 'c', 'z', 'x', 'v', 'g'
  ]
  const JUNG = [
    'k', 'o', 'i', 'O', 'j', 'p', 'u', 'P', 'h', 'hk', 'ho', 'hl', 'y', 'n', 'nj', 'np', 'nl', 'b', 'm', 'ml', 'l'
  ]
  const JONG = [
    '', 'r', 'R', 'rt', 's', 'sw', 'sg', 'e', 'f', 'fr', 'fa', 'fq', 'ft', 'fx', 'fv', 'fg', 'a', 'q', 'qt', 't',
    'T', 'd', 'w', 'c', 'z', 'x', 'v', 'g'
  ]
  const JAMO_SINGLE: Record<string, string> = {
    'ㄱ': 'r',
    'ㄲ': 'R',
    'ㄴ': 's',
    'ㄷ': 'e',
    'ㄸ': 'E',
    'ㄹ': 'f',
    'ㅁ': 'a',
    'ㅂ': 'q',
    'ㅃ': 'Q',
    'ㅅ': 't',
    'ㅆ': 'T',
    'ㅇ': 'd',
    'ㅈ': 'w',
    'ㅉ': 'W',
    'ㅊ': 'c',
    'ㅋ': 'z',
    'ㅌ': 'x',
    'ㅍ': 'v',
    'ㅎ': 'g',
    'ㅏ': 'k',
    'ㅐ': 'o',
    'ㅑ': 'i',
    'ㅒ': 'O',
    'ㅓ': 'j',
    'ㅔ': 'p',
    'ㅕ': 'u',
    'ㅖ': 'P',
    'ㅗ': 'h',
    'ㅘ': 'hk',
    'ㅙ': 'ho',
    'ㅚ': 'hl',
    'ㅛ': 'y',
    'ㅜ': 'n',
    'ㅝ': 'nj',
    'ㅞ': 'np',
    'ㅟ': 'nl',
    'ㅠ': 'b',
    'ㅡ': 'm',
    'ㅢ': 'ml',
    'ㅣ': 'l'
  }
  const out: string[] = []
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    // 한글 음절
    if (code >= 0xac00 && code <= 0xd7a3) {
      const sIndex = code - 0xac00
      const cho = Math.floor(sIndex / 588)
      const jung = Math.floor((sIndex % 588) / 28)
      const jong = sIndex % 28
      out.push(CHO[cho] + JUNG[jung] + JONG[jong])
      continue
    }
    // 한글 자모(단일)
    if (JAMO_SINGLE[ch]) {
      out.push(JAMO_SINGLE[ch])
      continue
    }
    out.push(ch)
  }
  return out.join('')
}

function onPasswordInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  password.value = hangulToQwerty(raw)
}

function onPasswordConfirmInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  passwordConfirm.value = hangulToQwerty(raw)
}

async function onSubmit() {
  loading.value = true
  error.value = null
  try {
    if (!canSubmit.value) {
      throw new Error(t('필수 항목을 모두 올바르게 입력해 주세요.', 'Please fill in all required fields correctly.'))
    }
    if (password.value !== passwordConfirm.value) {
      throw new Error(t('비밀번호 확인이 일치하지 않습니다.', 'Password confirmation does not match.'))
    }
    loadingTitle.value = '가입 처리 중입니다...'
    loadingDesc.value = '계정을 생성하고 있습니다.'
    loadingTitleEn.value = 'Signing up...'
    loadingDescEn.value = 'Creating your account.'
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        username: username.value,
        name: name.value,
        birthDate: birthDate.value,
        password: password.value,
        bankName: bankName.value,
        bankAccount: bankAccount.value,
        accountHolder: accountHolder.value,
        referralCode: referralCode.value,
        agreedToTerms: agreedToTerms.value
      }
    })

    loadingTitle.value = '인증 확인 중입니다...'
    loadingDesc.value = '세션을 적용하고 있습니다.'
    loadingTitleEn.value = 'Verifying...'
    loadingDescEn.value = 'Applying your session.'
    await refresh()

    loadingTitle.value = '거래소로 이동 중입니다...'
    loadingDesc.value = '잠시만 기다려주세요.'
    loadingTitleEn.value = 'Redirecting to the exchange...'
    loadingDescEn.value = 'Please wait a moment.'
    await navigateTo('/exchange/SAMSUNGUSDT')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || t('회원가입에 실패했습니다.', 'Sign up failed.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes progress {
  0% {
    transform: translateX(-120%);
  }
  50% {
    transform: translateX(180%);
  }
  100% {
    transform: translateX(420%);
  }
}
</style>
