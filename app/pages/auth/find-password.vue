<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-xl font-semibold">{{ t('비밀번호 찾기', 'Find Password') }}</h1>
    <p class="mt-1 text-sm text-slate-400">{{ t('아이디, 이름, 생년월일을 입력하면 운영자에게 초기화 요청 쪽지가 전송됩니다.', 'Enter your username, name, and date of birth to send a reset request to the operator.') }}</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">{{ t('아이디', 'Username') }}<span class="text-rose-400">*</span></label>
        <input v-model.trim="username" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="text-sm text-slate-300">{{ t('이름', 'Name') }}<span class="text-rose-400">*</span></label>
        <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
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
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
          @input="onBirthInput"
        />
      </div>
      <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:opacity-60" :disabled="loading || !canSubmit">
        {{ loading ? t('요청 전송 중...', 'Sending request...') : t('비밀번호 초기화 요청', 'Request Password Reset') }}
      </button>
      <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      <p v-if="okText" class="whitespace-pre-line text-sm text-emerald-300">{{ okText }}</p>
    </form>

    <div class="mt-5 flex items-center justify-between text-sm text-slate-400">
      <NuxtLink to="/auth/login" class="underline underline-offset-4 hover:text-indigo-300">{{ t('로그인으로 돌아가기', 'Back to Log In') }}</NuxtLink>
      <NuxtLink to="/auth/register" class="underline underline-offset-4 hover:text-indigo-300">{{ t('회원가입', 'Sign Up') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const username = ref('')
const name = ref('')
const birthDate = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

const birthDateValid = computed(() => {
  const v = birthDate.value.trim()
  if (!v) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map((n) => Number(n))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false
  const dt = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d
})

const canSubmit = computed(() => Boolean(username.value.trim() && name.value.trim() && birthDateValid.value))

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

async function onSubmit() {
  loading.value = true
  error.value = null
  okText.value = null
  try {
    if (!canSubmit.value) {
      throw new Error(t('필수 항목을 모두 올바르게 입력해 주세요.', 'Please fill in all required fields correctly.'))
    }
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        username: username.value,
        name: name.value,
        birthDate: birthDate.value
      }
    })
    okText.value = t(
      '비밀번호 초기화 요청이 완료되었습니다.\n초기화 승인 될 경우 비밀번호는 1234로 초기화됩니다.',
      'Your password reset request has been submitted.\nIf approved, your password will be reset to 1234.'
    )
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('초기화 요청에 실패했습니다.', 'Reset request failed.')
  } finally {
    loading.value = false
  }
}
</script>
