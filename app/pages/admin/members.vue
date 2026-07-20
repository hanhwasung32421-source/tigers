<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">회원 목록</h1>
        <p class="mt-1 text-sm text-slate-400">회원 목록을 조회합니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load()">
          새로고침
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="grid gap-2 md:grid-cols-[220px_160px_minmax(240px,1fr)_120px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="w-full bg-transparent outline-none" />
        </div>
        <select v-model="roleFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유저권한</option>
          <option value="회원">회원</option>
          <option value="총판">총판</option>
          <option value="관리자">관리자</option>
        </select>
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <select v-model="onlineFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">접속여부</option>
          <option value="접속">접속</option>
          <option value="미접속">미접속</option>
        </select>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">유저권한</th>
              <th class="px-3 py-3 text-left">승인상태</th>
              <th class="px-3 py-3 text-left">아이디</th>
              <th class="px-3 py-3 text-left">회원이름</th>
              <th class="px-3 py-3 text-left">총판이름</th>
              <th class="px-3 py-3 text-left">총판부모</th>
              <th class="px-3 py-3 text-right">총판수율</th>
              <th class="px-3 py-3 text-right">누적 손실</th>
              <th class="px-3 py-3 text-left">가입일</th>
              <th class="px-3 py-3 text-left">접속여부</th>
              <th class="px-3 py-3 text-center">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="11" class="px-3 py-8 text-center text-slate-500">데이터가 없습니다.</td>
            </tr>
            <tr v-for="u in paged" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3">
                <span class="rounded bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">{{ u.role }}</span>
              </td>
              <td class="px-3 py-3">
                <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">승인</span>
              </td>
              <td class="px-3 py-3 font-mono text-slate-100">{{ u.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ u.name }}</td>
              <td class="px-3 py-3 text-slate-300">{{ u.affiliateName }}</td>
              <td class="px-3 py-3 text-slate-500">{{ u.affiliateParent }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmtRate(u.affiliateRate) }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmt2(u.cumulativeLoss) }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ dateOnly(u.created_at) }}</td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                  :class="u.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                >
                  {{ u.online ? '접속' : '미접속' }}
                </span>
              </td>
              <td class="px-3 py-3 text-center">
                <span class="text-slate-500">…</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <span class="min-w-9 rounded bg-white/10 px-3 py-1.5 text-center text-sm">{{ page }}</span>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type MemberRow = {
  id: number
  role: string
  approved: boolean
  username: string
  name: string
  affiliateName: string
  affiliateParent: string
  affiliateRate: number
  cumulativeLoss: number
  created_at: string
  online: boolean
  last_ip: string | null
}

const { refresh } = useMe()
await refresh()

const items = ref<MemberRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const onlineFilter = ref('')
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const pageSize = 10

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function fmt2(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtRate(v: number) {
  return `${Number(v || 0).toFixed(2)}`
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((u) => {
    if (roleFilter.value && u.role !== roleFilter.value) return false
    if (onlineFilter.value) {
      const want = onlineFilter.value === '접속'
      if (u.online !== want) return false
    }
    if (fromDate.value) {
      const d = dateOnly(u.created_at)
      if (d < fromDate.value) return false
    }
    if (toDate.value) {
      const d = dateOnly(u.created_at)
      if (d > toDate.value) return false
    }
    if (!q) return true
    return [u.username, u.name, u.affiliateName, String(u.id)].some((v) => String(v).toLowerCase().includes(q))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ items: MemberRow[] }>('/api/admin/members')
    items.value = res.items || []
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '회원 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load().catch(() => {})
})
</script>

