<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">관리자 대시보드</h1>
      <p class="mt-2 text-sm text-slate-400">
        유저 목록 확인, 가상 USDT 입금, (추후) 지사 계정 생성/권한 제어를 여기서 확장합니다.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink
          v-if="me?.role === 'super_admin'"
          to="/admin/create-branch"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          계정생성
        </NuxtLink>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="text-sm text-slate-400">현재 로그인</div>
      <div class="mt-1 font-medium">{{ me?.username }} ({{ me?.role }})</div>
    </div>

    <!-- 강제청산 기준(%) 설정 -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
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
            :disabled="me?.role !== 'super_admin'"
          />
          <span class="text-sm text-slate-400">% 손실 시 강제청산</span>
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="me?.role !== 'super_admin' || liquidationSettingSaving"
          @click="saveLiquidationSetting"
        >
          저장
        </button>
        <span class="text-sm text-slate-400">현재 적용값: -{{ liquidationPercent }}%</span>
      </div>
      <p v-if="liquidationSettingError" class="mt-3 text-sm text-red-300">{{ liquidationSettingError }}</p>
      <p v-if="liquidationSettingMsg" class="mt-3 text-sm text-emerald-300">{{ liquidationSettingMsg }}</p>
    </div>

    <!-- 킬UP/킬DOWN 이력 -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
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

    <!-- 부관리자 메뉴 권한 -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
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

    <!-- 유저/권한 관리 -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">유저 및 권한 관리</h2>
          <p class="mt-1 text-sm text-slate-400">사용자 역할과 추천코드를 관리합니다.</p>
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

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('id')">ID{{ sortArrow('id') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('username')">아이디{{ sortArrow('username') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('name')">이름{{ sortArrow('name') }}</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('usdt')">USDT잔액{{ sortArrow('usdt') }}</th>
                <th class="py-2">추천코드</th>
                <th class="cursor-pointer select-none py-2" @click="toggleSort('role')">역할(권한 변경){{ sortArrow('role') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in sortedUsers" :key="u.id" class="border-t border-white/10">
                <td class="py-2 font-mono">{{ u.id }}</td>
                <td class="py-2 font-mono">{{ u.username }}</td>
                <td class="py-2">{{ u.name || '—' }}</td>
                <td class="py-2 font-mono">{{ (u.usdt ?? 0).toFixed(2) }}</td>
                <td class="py-2">
                  <div class="flex items-center gap-2">
                    <input
                      v-model.trim="referralDraft[u.id]"
                      class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    />
                    <button
                      class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="referralSaving === u.id"
                      @click="updateReferralCode(u.id)"
                    >
                      저장
                    </button>
                  </div>
                </td>
                <td class="py-2">
                  <select
                    v-model="roleDraft[u.id]"
                    class="w-48 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    :disabled="!canEditRole"
                    @change="updateRole(u.id)"
                  >
                    <option value="user">일반 유저 (user)</option>
                    <option value="branch_admin">부어드민 (branch_admin)</option>
                    <option value="super_admin">최고관리자 (super_admin)</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
        <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
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

type AdminUserRow = { id: number; username: string; name: string; referralCode: string; role: string; usdt: number; created_at: string }

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const roleDraft = reactive<Record<number, string>>({})
const referralDraft = reactive<Record<number, string>>({})
const referralSaving = ref<number | null>(null)
const userSearch = ref('')
const sortKey = ref<'id' | 'username' | 'name' | 'usdt' | 'role'>('id')
const sortDir = ref<'asc' | 'desc'>('desc')

const canEditRole = computed(() => me.value?.role === 'super_admin')

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
  const filtered = q
    ? users.value.filter((u) => [u.username, u.name, String(u.id)].some((v) => String(v || '').toLowerCase().includes(q)))
    : users.value.slice()
  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    const key = sortKey.value
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
})

async function updateReferralCode(userId: number) {
  const referralCode = String(referralDraft[userId] ?? '').trim()
  referralSaving.value = userId
  error.value = null
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, referralCode } })
    await load()
    msg.value = '추천코드가 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '추천코드 수정 실패'
  } finally {
    referralSaving.value = null
  }
}

// 부관리자 메뉴 권한
type MenuKey = 'members' | 'online' | 'trades' | 'transfers' | 'positions' | 'messages'
const menuKeys: MenuKey[] = ['members', 'online', 'trades', 'transfers', 'positions', 'messages']
const menuMeta: Record<MenuKey, { label: string; editable: boolean; editLabel?: string }> = {
  members: { label: '회원 목록', editable: true, editLabel: '보유금액 수정' },
  online: { label: '실시간 접속', editable: false },
  trades: { label: '거래 내역', editable: false },
  transfers: { label: '입출금 내역', editable: false },
  positions: { label: '포지션 목록', editable: true, editLabel: '포지션 수정' },
  messages: { label: '쪽지관리', editable: false }
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
  messages: { view: true, edit: false }
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
      roleDraft[u.id] = String(u.role || 'user')
      referralDraft[u.id] = String(u.referralCode || '')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

async function updateRole(userId: number) {
  const role = String(roleDraft[userId] || 'user')
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, role } })
    await load()
    msg.value = '역할이 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '역할 수정 실패'
  }
}

await load()
await loadLiquidationSetting()
await loadKillEvents()
await loadBranchAdmins()
</script>
