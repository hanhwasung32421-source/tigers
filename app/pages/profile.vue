<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold">{{ t('회원정보 변경', 'Edit Profile') }}</h1>
      <p class="mt-1 text-sm text-slate-400">{{ t('추천코드를 제외한 회원 정보를 수정할 수 있습니다.', 'You can edit your member info, except for the referral code.') }}</p>
    </div>

    <form class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6" @submit.prevent="save">
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">{{ t('아이디', 'Username') }}</label>
          <input :value="me?.username || ''" disabled class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-400 outline-none ring-1 ring-white/10" />
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('추천코드', 'Referral Code') }}</label>
          <input :value="me?.referral_code || ''" disabled class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-400 outline-none ring-1 ring-white/10" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">{{ t('이름', 'Name') }}</label>
          <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('생년월일', 'Date of Birth') }}</label>
          <input v-model="birthDate" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" @input="onBirthInput" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">{{ t('은행명', 'Bank') }}</label>
          <select v-model="bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500">
            <option v-for="bank in banks" :key="bank.ko" :value="bank.ko">{{ t(bank.ko, bank.en) }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('은행계좌', 'Account Number') }}</label>
          <input v-model.trim="bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">{{ t('예금주', 'Account Holder') }}</label>
        <input v-model.trim="accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>

      <div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div class="text-sm font-medium text-slate-200">{{ t('비밀번호 변경', 'Change Password') }}</div>
        <div class="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm text-slate-300">{{ t('새 비밀번호', 'New Password') }}</label>
            <input v-model="newPassword" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('새 비밀번호 확인', 'Confirm New Password') }}</label>
            <input v-model="newPasswordConfirm" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-500">{{ t('변경하지 않을 경우 비워두세요.', 'Leave blank if you do not want to change it.') }}</p>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:opacity-60" :disabled="saving">
          {{ saving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
        </button>
      </div>
      <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      <p v-if="okText" class="text-sm text-emerald-300">{{ okText }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { t } = useLocale()
const { me, refresh } = useMe()
await refresh()

const banks = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]

const name = ref(me.value?.name || '')
const birthDate = ref(me.value?.birth_date || '')
const bankName = ref(me.value?.bank_name || banks[0].ko)
const bankAccount = ref(me.value?.bank_account || '')
const accountHolder = ref(me.value?.account_holder || '')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

// 숫자만 쳐도(19770101) YYYY-MM-DD 형태로 자동으로 맞춘다.
function onBirthInput(e: Event) {
  const digits = String((e.target as HTMLInputElement)?.value || '').replace(/\D/g, '').slice(0, 8)
  let out = digits.slice(0, 4)
  if (digits.length > 4) out += `-${digits.slice(4, 6)}`
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`
  birthDate.value = out
}

async function save() {
  saving.value = true
  error.value = null
  okText.value = null
  try {
    if ((newPassword.value || newPasswordConfirm.value) && newPassword.value !== newPasswordConfirm.value) {
      throw new Error(t('새 비밀번호 확인이 일치하지 않습니다.', 'New password confirmation does not match.'))
    }
    await $fetch('/api/me/profile', {
      method: 'POST',
      body: {
        name: name.value,
        birthDate: birthDate.value,
        bankName: bankName.value,
        bankAccount: bankAccount.value,
        accountHolder: accountHolder.value,
        newPassword: newPassword.value || undefined
      }
    })
    await refresh()
    newPassword.value = ''
    newPasswordConfirm.value = ''
    okText.value = t('회원정보를 저장했습니다.', 'Profile saved.')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('회원정보 저장에 실패했습니다.', 'Failed to save profile.')
  } finally {
    saving.value = false
  }
}
</script>
