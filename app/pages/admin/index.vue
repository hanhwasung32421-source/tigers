<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">관리자 대시보드</h1>
          <p class="mt-1 text-sm text-slate-400">{{ me?.username }} ({{ me?.role }})</p>
        </div>
        <NuxtLink
          v-if="me?.role === 'super_admin'"
          to="/admin/create-branch"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          계정생성
        </NuxtLink>
      </div>
    </div>

    <!-- 탭 -->
    <div class="flex flex-wrap gap-1 border-b border-white/10">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium transition"
        :class="activeTab === t.key ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 유저/권한 관리 -->
    <div v-show="activeTab === 'users'" class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">유저 및 권한 관리</h2>
          <p class="mt-1 text-sm text-slate-400">아이디/이름/USDT잔액/추천코드/역할을 클릭해서 바로 수정하고, 저장을 눌러 반영합니다.</p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model.trim="userSearch"
            placeholder="아이디/이름 검색"
            class="w-48 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="load">
            새로고침
          </button>
        </div>
      </div>

      <div v-if="referralFilter" class="flex items-center gap-2 text-sm text-slate-300">
        <span class="rounded-md bg-indigo-500/15 px-3 py-1.5 text-indigo-200 ring-1 ring-indigo-400/30">
          하부보기: 추천코드 "{{ referralFilter }}"
        </span>
        <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="referralFilter = null">
          필터 해제
        </button>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('username')">아이디{{ sortArrow('username') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('name')">이름{{ sortArrow('name') }}</th>
                <th class="py-2">계좌정보</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('usdt')">USDT잔액{{ sortArrow('usdt') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('referralCode')">추천코드{{ sortArrow('referralCode') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('role')">역할{{ sortArrow('role') }}</th>
                <th class="py-2">정산유형</th>
                <th class="py-2">하부보기</th>
                <th class="py-2">저장</th>
                <th class="py-2">비밀번호 초기화</th>
                <th class="py-2">로그인</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in sortedUsers" :key="u.id" class="border-t border-white/10">
                <template v-if="userDraft[u.id]">
                  <td class="py-2">
                    <input
                      v-model.trim="userDraft[u.id].username"
                      class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="py-2">
                    <input
                      v-model.trim="userDraft[u.id].name"
                      class="w-24 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="py-2">
                    <button class="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15" @click="openAccountModal(u)">
                      계좌정보
                    </button>
                  </td>
                  <td class="py-2">
                    <input
                      v-model.number="userDraft[u.id].usdt"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="py-2">
                    <input
                      v-model.trim="userDraft[u.id].referralCode"
                      class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="py-2">
                    <select
                      v-model="userDraft[u.id].role"
                      class="w-40 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    >
                      <option value="user">일반 유저 (user)</option>
                      <option value="branch_admin">부어드민 (branch_admin)</option>
                      <option value="super_admin">최고관리자 (super_admin)</option>
                    </select>
                  </td>
                  <td class="py-2">
                    <div class="flex flex-col gap-1 text-xs text-slate-300">
                      <label class="flex items-center gap-1.5">
                        <input v-model="userDraft[u.id].settlementTypes" type="checkbox" value="loss" class="h-3.5 w-3.5 accent-indigo-500" />
                        손실정산
                      </label>
                      <label class="flex items-center gap-1.5">
                        <input v-model="userDraft[u.id].settlementTypes" type="checkbox" value="referral" class="h-3.5 w-3.5 accent-indigo-500" />
                        레퍼럴정산
                      </label>
                    </div>
                  </td>
                  <td class="py-2">
                    <button class="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/15" @click="referralFilter = u.username">
                      하부보기
                    </button>
                  </td>
                  <td class="py-2">
                    <button
                      class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="userSaving === u.id"
                      @click="saveUserRow(u.id)"
                    >
                      저장
                    </button>
                  </td>
                  <td class="py-2">
                    <button
                      class="rounded-md bg-amber-500/15 px-3 py-1 text-sm text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="userResetting === u.id"
                      @click="resetUserPassword(u.id)"
                    >
                      초기화
                    </button>
                  </td>
                  <td class="py-2">
                    <button
                      class="rounded-md bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="loggingInAs === u.id"
                      @click="loginAsUser(u.id)"
                    >
                      로그인
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
        <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      </div>
    </div>

    <!-- 계좌정보 팝업 -->
    <div
      v-if="accountModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeAccountModal"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ accountModalTarget?.username }} 계좌정보</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeAccountModal">✕</button>
        </div>
        <div class="mt-4 space-y-3">
          <div>
            <label class="text-sm text-slate-300">은행명</label>
            <select v-model="accountDraft.bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500">
              <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-slate-300">계좌번호</label>
            <input v-model.trim="accountDraft.bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">예금주</label>
            <input v-model.trim="accountDraft.accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
        </div>
        <p v-if="accountModalError" class="mt-3 text-sm text-red-300">{{ accountModalError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeAccountModal">
            취소
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="accountModalSaving"
            @click="saveAccountModal"
          >
            저장
          </button>
        </div>
      </div>
    </div>

    <!-- 강제청산 기준(%) 설정 -->
    <div v-show="activeTab === 'liquidation'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">강제청산 기준 설정</h2>
      <p class="mt-1 text-sm text-slate-400">
        손실률(ROE)이 이 값 이하로 떨어지면 모든 유저의 포지션이 실시간으로 자동 강제청산됩니다.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <input
            v-model.number="liquidationPercentDraft"
            type="number"
            min="1"
            max="99"
            step="1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">% 손실 시 강제청산</span>
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="liquidationSettingSaving"
          @click="saveLiquidationSetting"
        >
          저장
        </button>
        <span class="text-sm text-slate-400">현재 적용값: -{{ liquidationPercent }}%</span>
      </div>
      <p v-if="liquidationSettingError" class="mt-3 text-sm text-red-300">{{ liquidationSettingError }}</p>
      <p v-if="liquidationSettingMsg" class="mt-3 text-sm text-emerald-300">{{ liquidationSettingMsg }}</p>
    </div>

    <!-- 정산/기타 설정 -->
    <div v-show="activeTab === 'misc'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">정산/기타 설정</h2>
      <p class="mt-1 text-sm text-slate-400">고객센터 텔레그램 링크, 원/USDT 환율, 정산 비율을 설정합니다.</p>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">고객센터 텔레그램 링크</label>
          <input
            v-model.trim="miscDraft.telegramUrl"
            placeholder="https://t.me/..."
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">원/USDT 환율 (0 = 실시간 시세 사용)</label>
          <input
            v-model.number="miscDraft.krwPerUsdt"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">손실정산 비율 (%)</label>
          <input
            v-model.number="miscDraft.lossSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">레퍼럴정산 비율 (%)</label>
          <input
            v-model.number="miscDraft.referralSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="miscSaving"
          @click="saveMiscSettings"
        >
          저장
        </button>
        <p v-if="miscError" class="text-sm text-red-300">{{ miscError }}</p>
        <p v-if="miscMsg" class="text-sm text-emerald-300">{{ miscMsg }}</p>
      </div>
    </div>

    <!-- 부관리자 메뉴 권한 -->
    <div v-show="activeTab === 'branchPerms'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">부관리자 메뉴 권한</h2>
          <p class="mt-1 text-sm text-slate-400">부관리자별로 관리자 메뉴에서 무엇을 볼 수 있고, 무엇을 수정할 수 있는지 설정합니다.</p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadBranchAdmins">
          새로고침
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="branchAdminsLoading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="branchAdmins.length === 0" class="text-sm text-slate-400">부관리자 계정이 없습니다.</div>
        <div v-else class="space-y-2">
          <div v-for="b in branchAdmins" :key="b.id" class="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div class="flex items-center justify-between">
              <span class="font-mono text-sm text-slate-100">{{ b.username }}</span>
              <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="openMenuPermModal(b)">
                메뉴 권한 설정
              </button>
            </div>
          </div>
        </div>
        <p v-if="branchAdminsError" class="mt-3 text-sm text-red-300">{{ branchAdminsError }}</p>
      </div>
    </div>

    <!-- 킬UP/킬DOWN 이력 -->
    <div v-show="activeTab === 'killEvents'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">킬UP/킬DOWN 이력</h2>
          <p class="mt-1 text-sm text-slate-400">
            삭제하면 모든 유저의 차트에서도 해당 봉의 고가/저가(꼬리)가 사라집니다(잠시 후 자동 반영).
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadKillEvents">
          새로고침
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="killEventsLoading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="killEvents.length === 0" class="text-sm text-slate-400">킬 이력이 없습니다.</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">시각</th>
                <th class="py-2">심볼</th>
                <th class="py-2">방향</th>
                <th class="py-2">퍼센트</th>
                <th class="py-2">기준가 → 도달가</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in killEvents" :key="k.id" class="border-t border-white/10">
                <td class="py-2 font-mono text-xs">{{ formatKillTime(k.createdAt) }}</td>
                <td class="py-2 font-mono">{{ k.symbol }}</td>
                <td class="py-2" :class="k.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ k.direction === 'up' ? '킬UP' : '킬DOWN' }}
                </td>
                <td class="py-2 font-mono">{{ k.percent }}%</td>
                <td class="py-2 font-mono">{{ k.basePrice }} → {{ k.shockedPrice }}</td>
                <td class="py-2">
                  <button
                    class="rounded-md bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="killEventDeleting === k.id"
                    @click="deleteKillEvent(k.id)"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="killEventsError" class="mt-3 text-sm text-red-300">{{ killEventsError }}</p>
      </div>
    </div>

    <!-- 부관리자 메뉴 권한 설정 팝업 -->
    <div
      v-if="menuPermModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeMenuPermModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ menuPermTarget?.username }} 메뉴 권한</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeMenuPermModal">✕</button>
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="key in menuKeys" :key="key" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-200">{{ menuMeta[key].label }}</span>
              <label class="flex items-center gap-1.5 text-xs text-slate-300">
                <input v-model="menuPermDraft[key].view" type="checkbox" class="h-4 w-4 accent-indigo-500" />
                보임
              </label>
            </div>
            <label v-if="menuMeta[key].editable" class="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <input v-model="menuPermDraft[key].edit" type="checkbox" class="h-4 w-4 accent-indigo-500" :disabled="!menuPermDraft[key].view" />
              {{ menuMeta[key].editLabel }} 허용
            </label>
          </div>
        </div>
        <p v-if="menuPermError" class="mt-3 text-sm text-red-300">{{ menuPermError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeMenuPermModal">
            취소
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="menuPermSaving"
            @click="saveMenuPerm"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })
const { me, refresh } = useMe()
await refresh()

type TabKey = 'users' | 'liquidation' | 'misc' | 'branchPerms' | 'killEvents'
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'users', label: '유저 및 권한 관리' },
  { key: 'liquidation', label: '강제청산 기준 설정' },
  { key: 'misc', label: '정산/기타 설정' },
  { key: 'branchPerms', label: '부관리자 메뉴 권한' },
  { key: 'killEvents', label: '킬UP/킬DOWN 이력' }
]
const activeTab = ref<TabKey>('users')

type AdminUserRow = {
  id: number
  username: string
  name: string
  referralCode: string
  bankName: string
  bankAccount: string
  accountHolder: string
  role: string
  usdt: number
  created_at: string
  settlementTypes: string[]
}
type UserDraft = { username: string; name: string; usdt: number; referralCode: string; role: string; settlementTypes: string[] }

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const userDraft = reactive<Record<number, UserDraft>>({})
const userSaving = ref<number | null>(null)
const userResetting = ref<number | null>(null)
const loggingInAs = ref<number | null>(null)
const userSearch = ref('')
const referralFilter = ref<string | null>(null)
const sortKey = ref<'username' | 'name' | 'usdt' | 'referralCode' | 'role'>('username')
const sortDir = ref<'asc' | 'desc'>('asc')

const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: typeof sortKey.value) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const sortedUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  let filtered = q
    ? users.value.filter((u) => [u.username, u.name, String(u.id)].some((v) => String(v || '').toLowerCase().includes(q)))
    : users.value.slice()
  if (referralFilter.value) {
    filtered = filtered.filter((u) => u.referralCode === referralFilter.value)
  }
  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    const key = sortKey.value
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
})

async function saveUserRow(userId: number) {
  const draft = userDraft[userId]
  if (!draft) return
  userSaving.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId,
        username: draft.username,
        name: draft.name,
        usdt: Number(draft.usdt) || 0,
        referralCode: draft.referralCode,
        role: draft.role,
        settlementTypes: draft.settlementTypes
      }
    })
    await load()
    msg.value = '저장되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    userSaving.value = null
  }
}

async function resetUserPassword(userId: number) {
  if (process.client && !window.confirm('이 유저의 비밀번호를 아이디와 동일하게 초기화할까요?')) return
  userResetting.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/reset-password', { method: 'POST', body: { userId } })
    msg.value = '비밀번호가 아이디와 동일하게 초기화되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '초기화 실패'
  } finally {
    userResetting.value = null
  }
}

async function loginAsUser(userId: number) {
  if (process.client && !window.confirm('이 유저 계정으로 바로 로그인할까요? (현재 관리자 세션은 이 브라우저에서 그 유저 세션으로 전환됩니다)')) return
  loggingInAs.value = userId
  error.value = null
  try {
    await $fetch('/api/admin/users/login-as', { method: 'POST', body: { userId } })
    if (process.client) window.location.href = '/'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '로그인 실패'
  } finally {
    loggingInAs.value = null
  }
}

// 계좌정보 팝업
const accountModalOpen = ref(false)
const accountModalTarget = ref<AdminUserRow | null>(null)
const accountDraft = reactive({ bankName: banks[0], bankAccount: '', accountHolder: '' })
const accountModalSaving = ref(false)
const accountModalError = ref<string | null>(null)

function openAccountModal(u: AdminUserRow) {
  accountModalTarget.value = u
  accountDraft.bankName = u.bankName || banks[0]
  accountDraft.bankAccount = u.bankAccount || ''
  accountDraft.accountHolder = u.accountHolder || ''
  accountModalError.value = null
  accountModalOpen.value = true
}

function closeAccountModal() {
  accountModalOpen.value = false
  accountModalTarget.value = null
}

async function saveAccountModal() {
  if (!accountModalTarget.value) return
  accountModalSaving.value = true
  accountModalError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: accountModalTarget.value.id,
        bankName: accountDraft.bankName,
        bankAccount: accountDraft.bankAccount,
        accountHolder: accountDraft.accountHolder
      }
    })
    await load()
    closeAccountModal()
  } catch (e: any) {
    accountModalError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    accountModalSaving.value = false
  }
}

// 부관리자 메뉴 권한
type MenuKey = 'members' | 'online' | 'trades' | 'transfers' | 'positions' | 'messages' | 'settlement'
const menuKeys: MenuKey[] = ['members', 'online', 'trades', 'transfers', 'positions', 'messages', 'settlement']
const menuMeta: Record<MenuKey, { label: string; editable: boolean; editLabel?: string }> = {
  members: { label: '회원 목록', editable: true, editLabel: '보유금액 수정' },
  online: { label: '실시간 접속', editable: false },
  trades: { label: '거래 내역', editable: false },
  transfers: { label: '입출금 내역', editable: false },
  positions: { label: '포지션 목록', editable: true, editLabel: '포지션 수정' },
  messages: { label: '쪽지관리', editable: false },
  settlement: { label: '정산내역', editable: true, editLabel: '입금 승인/거절' }
}
type BranchAdminRow = { id: number; username: string; menus: Record<MenuKey, { view: boolean; edit: boolean }> }
const branchAdmins = ref<BranchAdminRow[]>([])
const branchAdminsLoading = ref(false)
const branchAdminsError = ref<string | null>(null)
const menuPermModalOpen = ref(false)
const menuPermTarget = ref<BranchAdminRow | null>(null)
const menuPermDraft = reactive<Record<MenuKey, { view: boolean; edit: boolean }>>({
  members: { view: true, edit: false },
  online: { view: true, edit: false },
  trades: { view: true, edit: false },
  transfers: { view: true, edit: false },
  positions: { view: true, edit: false },
  messages: { view: true, edit: false },
  settlement: { view: true, edit: false }
})
const menuPermSaving = ref(false)
const menuPermError = ref<string | null>(null)

async function loadBranchAdmins() {
  branchAdminsLoading.value = true
  branchAdminsError.value = null
  try {
    const data = await $fetch<{ items: BranchAdminRow[] }>('/api/admin/branch-admins')
    branchAdmins.value = data.items || []
  } catch (e: any) {
    branchAdminsError.value = e?.data?.statusMessage || '부관리자 목록 불러오기 실패'
  } finally {
    branchAdminsLoading.value = false
  }
}

function openMenuPermModal(b: BranchAdminRow) {
  menuPermTarget.value = b
  for (const key of menuKeys) {
    menuPermDraft[key].view = b.menus?.[key]?.view !== false
    menuPermDraft[key].edit = Boolean(b.menus?.[key]?.edit)
  }
  menuPermError.value = null
  menuPermModalOpen.value = true
}

function closeMenuPermModal() {
  menuPermModalOpen.value = false
  menuPermTarget.value = null
}

async function saveMenuPerm() {
  if (!menuPermTarget.value) return
  menuPermSaving.value = true
  menuPermError.value = null
  try {
    const menus: Record<string, { view: boolean; edit: boolean }> = {}
    for (const key of menuKeys) menus[key] = { view: menuPermDraft[key].view, edit: menuPermDraft[key].edit }
    await $fetch('/api/admin/users/menu-permissions', {
      method: 'POST',
      body: { userId: menuPermTarget.value.id, menus }
    })
    await loadBranchAdmins()
    closeMenuPermModal()
  } catch (e: any) {
    menuPermError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    menuPermSaving.value = false
  }
}

type KillEventRow = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  createdAt: string
}
const killEvents = ref<KillEventRow[]>([])
const killEventsLoading = ref(false)
const killEventsError = ref<string | null>(null)
const killEventDeleting = ref<number | null>(null)

function formatKillTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', { hour12: false })
}

async function loadKillEvents() {
  killEventsLoading.value = true
  killEventsError.value = null
  try {
    const data = await $fetch<{ items: KillEventRow[] }>('/api/admin/kill/list')
    killEvents.value = data.items || []
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || '킬 이력 불러오기 실패'
  } finally {
    killEventsLoading.value = false
  }
}

async function deleteKillEvent(id: number) {
  killEventDeleting.value = id
  killEventsError.value = null
  try {
    await $fetch('/api/admin/kill/delete', { method: 'POST', body: { id } })
    killEvents.value = killEvents.value.filter((k) => k.id !== id)
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || '삭제 실패'
  } finally {
    killEventDeleting.value = null
  }
}

const liquidationPercent = ref(40)
const liquidationPercentDraft = ref(40)
const liquidationSettingSaving = ref(false)
const liquidationSettingError = ref<string | null>(null)
const liquidationSettingMsg = ref<string | null>(null)

async function loadLiquidationSetting() {
  try {
    const data = await $fetch<{ liquidationRoe: number }>('/api/settings/system')
    const percent = Math.abs(Number(data.liquidationRoe) || 40)
    liquidationPercent.value = percent
    liquidationPercentDraft.value = percent
  } catch {
    // 기본값 유지
  }
}

async function saveLiquidationSetting() {
  const percent = Math.round(Number(liquidationPercentDraft.value))
  if (!Number.isFinite(percent) || percent < 1 || percent > 99) {
    liquidationSettingError.value = '1~99 사이의 숫자를 입력해주세요.'
    return
  }
  liquidationSettingSaving.value = true
  liquidationSettingError.value = null
  liquidationSettingMsg.value = null
  try {
    const res = await $fetch<{ liquidationRoe: number }>('/api/admin/settings/system', {
      method: 'POST',
      body: { liquidationRoe: -percent }
    })
    liquidationPercent.value = Math.abs(res.liquidationRoe)
    liquidationPercentDraft.value = liquidationPercent.value
    liquidationSettingMsg.value = '저장되었습니다. 모든 유저에게 실시간으로 반영됩니다.'
  } catch (e: any) {
    liquidationSettingError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    liquidationSettingSaving.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  msg.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    for (const u of users.value) {
      userDraft[u.id] = {
        username: u.username,
        name: u.name || '',
        usdt: Number(u.usdt ?? 0),
        referralCode: u.referralCode || '',
        role: u.role || 'user',
        settlementTypes: Array.isArray(u.settlementTypes) ? [...u.settlementTypes] : []
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

// 정산/기타 설정
const miscDraft = reactive({
  telegramUrl: '',
  krwPerUsdt: 0,
  lossSettlementPercent: 0,
  referralSettlementPercent: 0
})
const miscSaving = ref(false)
const miscError = ref<string | null>(null)
const miscMsg = ref<string | null>(null)

async function loadMiscSettings() {
  try {
    const data = await $fetch<typeof miscDraft>('/api/admin/settings/misc')
    miscDraft.telegramUrl = data.telegramUrl || ''
    miscDraft.krwPerUsdt = Number(data.krwPerUsdt || 0)
    miscDraft.lossSettlementPercent = Number(data.lossSettlementPercent || 0)
    miscDraft.referralSettlementPercent = Number(data.referralSettlementPercent || 0)
  } catch {
    // 기본값 유지
  }
}

async function saveMiscSettings() {
  miscSaving.value = true
  miscError.value = null
  miscMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', {
      method: 'POST',
      body: {
        telegramUrl: miscDraft.telegramUrl,
        krwPerUsdt: Number(miscDraft.krwPerUsdt) || 0,
        lossSettlementPercent: Number(miscDraft.lossSettlementPercent) || 0,
        referralSettlementPercent: Number(miscDraft.referralSettlementPercent) || 0
      }
    })
    miscMsg.value = '저장되었습니다.'
  } catch (e: any) {
    miscError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    miscSaving.value = false
  }
}

await load()
await loadLiquidationSetting()
await loadMiscSettings()
await loadKillEvents()
await loadBranchAdmins()
</script>
