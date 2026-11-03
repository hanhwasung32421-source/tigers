<template>
  <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div class="text-[15px] font-semibold text-white">{{ t('입출금 계좌 입력', 'Enter your deposit/withdrawal account') }}</div>
    <p class="mt-1 text-xs text-slate-400">{{ t('입금·출금 확인을 위해 본인 명의 계좌를 한 번만 입력해 주세요.', 'Please enter your own bank account once for deposit/withdrawal confirmation.') }}</p>
    <div class="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
      <input
        v-model="bankAccount"
        inputmode="numeric"
        :placeholder="t('계좌번호(숫자만)', 'Account number (digits only)')"
        class="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
        @input="onAccountInput"
      />
      <select v-model="bankName" class="w-full rounded-lg bg-black/70 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/20 focus:ring-indigo-500">
        <option disabled value="">{{ t('은행 선택', 'Select bank') }}</option>
        <option v-for="bank in banks" :key="bank.ko" :value="bank.ko">{{ t(bank.ko, bank.en) }}</option>
      </select>
    </div>
    <input
      v-model.trim="accountHolder"
      :placeholder="t('예금주(한글)', 'Account holder (Korean)')"
      class="mt-2 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
    />
    <p v-if="error" class="mt-2 text-xs font-medium text-rose-400">{{ error }}</p>
    <button
      type="button"
      class="mt-3 w-full rounded-lg bg-[#f0b90b] py-2.5 text-sm font-semibold text-[#383A3E] hover:bg-[#d9a609] disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="saving"
      @click="save"
    >
      {{ t('저장', 'Save') }}
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'saved'): void }>()
const { t } = useLocale()
const { me } = useMe()

const bankAccount = ref('')
const bankName = ref('')
const accountHolder = ref('')
const saving = ref(false)
const error = ref('')

const banks = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]

function onAccountInput(e: Event) {
  bankAccount.value = String((e.target as HTMLInputElement)?.value || '').replace(/\D/g, '')
}

async function save() {
  if (saving.value) return
  error.value = ''
  if (!bankAccount.value.trim()) return void (error.value = t('계좌번호를 입력해 주세요.', 'Please enter your account number.'))
  if (!bankName.value) return void (error.value = t('은행을 선택해 주세요.', 'Please select your bank.'))
  if (!accountHolder.value.trim()) return void (error.value = t('예금주를 입력해 주세요.', 'Please enter the account holder name.'))
  if (!/^[가-힣\s]+$/.test(accountHolder.value.trim())) return void (error.value = t('예금주는 한국어만 사용 가능합니다', 'Only Korean characters are allowed'))
  saving.value = true
  try {
    await $fetch('/api/me/bank', {
      method: 'POST',
      body: { bankName: bankName.value, bankAccount: bankAccount.value, accountHolder: accountHolder.value }
    })
    // 화면의 내 정보도 바로 바꿔서 이 폼이 다시 뜨지 않게 한다(다른 서버가 20초 안에 옛 정보를 줘도 다시 뜨지 않도록 브라우저에도 표시해 둔다).
    if (me.value) {
      me.value = { ...me.value, bank_name: bankName.value, bank_account: bankAccount.value, account_holder: accountHolder.value }
      try {
        localStorage.setItem(`ktx_bank_saved_${me.value.id}`, '1')
      } catch {}
    }
    emit('saved')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('저장에 실패했습니다.', 'Failed to save.')
  } finally {
    saving.value = false
  }
}
</script>
