<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ t('실시간 접속', 'Live Connections') }}</h1>
        <p class="mt-1 text-sm text-slate-400">{{ t('1초마다 갱신됩니다.', 'Refreshes every second.') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">{{ t('대시보드', 'Dashboard') }}</NuxtLink>
        <span class="rounded-md border border-cyan-500/10 bg-cyan-500/5 px-3 py-2 text-xs font-data text-slate-300">{{ lastUpdatedText }}</span>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="grid gap-2 md:grid-cols-[minmax(240px,1fr)_160px]">
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          :placeholder="t('검색어를 입력하세요', 'Enter a search term')"
          :key="`online-search-${locale}`"
        />
        <select v-model="roleFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">{{ t('유저권한', 'User Role') }}</option>
          <option value="super_admin">{{ t('관리자', 'Admin') }}</option>
          <option value="admin">{{ t('부관리자', 'Sub Admin') }}</option>
          <option value="user">{{ t('회원', 'Member') }}</option>
        </select>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[12px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">{{ t('회원 ID', 'Member ID') }}</th>
              <th class="px-3 py-3 text-left">{{ t('회원아이디', 'Username') }}</th>
              <th class="px-3 py-3 text-left">{{ t('회원 이름', 'Name') }}</th>
              <th class="px-3 py-3 text-left">{{ t('권한', 'Role') }}</th>
              <th class="px-3 py-3 text-left">IP</th>
              <th class="px-3 py-3 text-left">{{ t('최근 접속', 'Last Seen') }}</th>
              <th class="px-3 py-3 text-center">{{ t('보유 포지션', 'Positions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="7" class="px-3 py-8 text-center text-slate-500">{{ t('접속중인 유저가 없습니다.', 'No users are currently connected.') }}</td>
            </tr>
            <tr v-for="u in filtered" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 font-data text-slate-300">#{{ u.id }}</td>
              <td class="px-3 py-3 font-semibold text-slate-100">
                <button type="button" class="underline-offset-4 hover:text-cyan-300 hover:underline" @click="memberInfoModal?.open(u.username)">
                  {{ u.username }}
                </button>
              </td>
              <td class="px-3 py-3 text-slate-200">{{ u.name || '—' }}</td>
              <td class="px-3 py-3 text-slate-300">{{ u.role }}</td>
              <td class="px-3 py-3 font-data text-slate-300">{{ u.ip || '—' }}</td>
              <td class="px-3 py-3 font-data text-slate-400">{{ u.lastSeenAt ? formatTime(u.lastSeenAt) : '—' }}</td>
              <td class="px-3 py-3 text-center">
                <button
                  v-if="u.positionSymbols.length"
                  type="button"
                  class="inline-flex flex-col items-center gap-0.5"
                  @click="goToPositions"
                >
                  <span class="rounded bg-rose-500/90 px-2 py-0.5 text-[12px] font-semibold text-white hover:bg-rose-500">
                    {{ t(`${u.positionSymbols.length}건`, `${u.positionSymbols.length}`) }}
                  </span>
                  <span class="text-[12px] text-slate-400">{{ u.positionSymbols.join(', ') }}</span>
                </button>
                <span v-else class="text-slate-600">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <AdminMemberInfoModal ref="memberInfoModal" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type OnlineRow = {
  id: number
  username: string
  name: string
  role: string
  roleId: string
  ip: string | null
  lastSeenAt: string | null
  online: boolean
  positionSymbols: string[]
}

const { t, locale } = useLocale()
const { refresh } = useMe()
await refresh()

const memberInfoModal = ref<{ open: (username: string) => void } | null>(null)
const items = ref<OnlineRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const lastUpdated = ref('')
let timer: any = null
let loadingNow = false

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((u) => {
    if (roleFilter.value === 'user' && u.roleId !== 'user') return false
    if (roleFilter.value === 'super_admin' && u.roleId !== 'super_admin') return false
    if (roleFilter.value === 'admin' && (u.roleId === 'user' || u.roleId === 'super_admin')) return false
    if (!q) return true
    return [u.username, String(u.id), u.ip || ''].some((v) => String(v).toLowerCase().includes(q))
  })
})

const lastUpdatedText = computed(() => (lastUpdated.value ? t(`갱신 ${lastUpdated.value}`, `Updated ${lastUpdated.value}`) : t('갱신 대기', 'Waiting to update')))

const router = useRouter()
function goToPositions() {
  router.push('/admin/positions')
}

function formatTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d)
}

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ items: OnlineRow[] }>('/api/admin/online')
    items.value = res.items || []
    lastUpdated.value = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('실시간 접속 목록을 불러오지 못했습니다.', 'Failed to load live connection list.')
  } finally {
    loading.value = false
    loadingNow = false
  }
}

onMounted(async () => {
  await load()
  timer = setInterval(() => load(true).catch(() => {}), 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
})
</script>

