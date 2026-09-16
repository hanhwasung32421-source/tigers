<template>
  <Transition name="member-info-modal">
    <div v-if="isOpen" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" @click.self="close">
      <div class="w-full max-w-2xl rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">{{ t('회원정보', 'Member Info') }}</h2>
            <p class="mt-1 text-sm text-slate-400">{{ t('아이디', 'Username') }} `{{ username }}`</p>
          </div>
          <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="close">{{ t('닫기', 'Close') }}</button>
        </div>

        <div v-if="loading" class="mt-6 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <p v-else-if="loadError" class="mt-6 text-sm text-rose-300">{{ loadError }}</p>
        <template v-else-if="detail">
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-sm text-slate-300">{{ t('이름', 'Name') }}</label>
              <input v-model.trim="draft.name" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('생년월일', 'Date of Birth') }}</label>
              <input v-model.trim="draft.birthDate" :disabled="!editable" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('은행명', 'Bank') }}</label>
              <select v-model="draft.bankName" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500">
                <option v-for="bank in banks" :key="bank.ko" :value="bank.ko">{{ t(bank.ko, bank.en) }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('은행계좌', 'Account Number') }}</label>
              <input v-model.trim="draft.bankAccount" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('예금주', 'Account Holder') }}</label>
              <input v-model.trim="draft.accountHolder" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('추천코드', 'Referral Code') }}</label>
              <input
                v-model.trim="draft.referralCode"
                :disabled="me?.role !== 'super_admin'"
                class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500"
              />
            </div>
          </div>

          <div v-if="editable" class="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              :disabled="saving"
              @click="save"
            >
              {{ saving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
            </button>
          </div>
          <p v-if="saveError" class="mt-3 text-sm text-rose-300">{{ saveError }}</p>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
              <div class="text-xs text-slate-400">{{ t('보유잔고', 'Balance') }}</div>
              <div class="mt-1 text-lg font-semibold text-cyan-100">{{ fmt2(detail.balanceUsdt) }} USDT</div>
            </div>
            <div class="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
              <div class="text-xs text-slate-400">{{ t('보유 포지션', 'Positions') }}</div>
              <div class="mt-1 text-lg font-semibold text-cyan-100">{{ t(`${detail.positions.length}건`, `${detail.positions.length}`) }}</div>
            </div>
          </div>

          <div v-if="detail.positions.length" class="mt-3 overflow-auto rounded-lg border border-white/10">
            <table class="min-w-full text-xs text-slate-200">
              <thead class="bg-white/5 text-slate-400">
                <tr>
                  <th class="px-3 py-2 text-left">{{ t('심볼', 'Symbol') }}</th>
                  <th class="px-3 py-2 text-left">{{ t('구분', 'Side') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('레버리지', 'Leverage') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('수량', 'Qty') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('진입가', 'Entry Price') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('증거금', 'Margin') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detail.positions" :key="p.id" class="border-t border-white/5">
                  <td class="px-3 py-2 font-semibold text-slate-100">{{ p.symbol }}</td>
                  <td class="px-3 py-2" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">{{ p.side === 'long' ? t('롱', 'Long') : t('숏', 'Short') }}</td>
                  <td class="px-3 py-2 text-right font-data text-slate-300">x{{ p.leverage }}</td>
                  <td class="px-3 py-2 text-right font-data text-slate-300">{{ fmt2(p.qty) }}</td>
                  <td class="px-3 py-2 text-right font-data text-slate-300">{{ fmt2(p.entryPrice) }}</td>
                  <td class="px-3 py-2 text-right font-data text-slate-300">{{ fmt2(p.margin) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
type MemberDetail = {
  id: number
  username: string
  name: string
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
  role: string
  createdAt: string
  balanceUsdt: number
  positions: Array<{ id: number; symbol: string; side: string; qty: number; entryPrice: number; leverage: number; margin: number }>
}

const emit = defineEmits<{ (e: 'saved'): void }>()

const { t } = useLocale()
const { me } = useMe()

const isOpen = ref(false)
const username = ref('')
const detail = ref<MemberDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

const draft = reactive({
  name: '',
  birthDate: '',
  bankName: '국민은행',
  bankAccount: '',
  accountHolder: '',
  referralCode: ''
})
const banks = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]

// 총관리자는 항상 수정 가능, 부관리자는 "회원 목록" 수정 권한이 있을 때만
const editable = computed(() => {
  if (me.value?.role === 'super_admin') return true
  if (me.value?.role && me.value.role !== 'user') return Boolean((me.value as any)?.permissions?.menus?.members?.edit)
  return false
})

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function open(uname: string) {
  username.value = uname
  isOpen.value = true
  detail.value = null
  loadError.value = null
  saveError.value = null
  loading.value = true
  try {
    const res = await $fetch<MemberDetail>('/api/admin/member-detail', { query: { username: uname } })
    detail.value = res
    draft.name = res.name
    draft.birthDate = res.birthDate
    draft.bankName = res.bankName || banks[0].ko
    draft.bankAccount = res.bankAccount
    draft.accountHolder = res.accountHolder
    draft.referralCode = res.referralCode
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || t('회원정보를 불러오지 못했습니다.', 'Failed to load member info.')
  } finally {
    loading.value = false
  }
}

function close() {
  isOpen.value = false
}

async function save() {
  if (!detail.value) return
  saving.value = true
  saveError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: detail.value.id,
        name: draft.name,
        birthDate: draft.birthDate,
        bankName: draft.bankName,
        bankAccount: draft.bankAccount,
        accountHolder: draft.accountHolder,
        ...(me.value?.role === 'super_admin' ? { referralCode: draft.referralCode } : {})
      }
    })
    emit('saved')
    close()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || t('회원정보 저장에 실패했습니다.', 'Failed to save member info.')
  } finally {
    saving.value = false
  }
}

defineExpose({ open, isOpen })
</script>

<style scoped>
.member-info-modal-enter-active,
.member-info-modal-leave-active {
  transition: opacity 0.15s ease;
}
.member-info-modal-enter-from,
.member-info-modal-leave-to {
  opacity: 0;
}
</style>
