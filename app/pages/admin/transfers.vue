<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">입출금 내역</h1>
        <p class="mt-1 text-sm text-slate-400">현재는 관리자 가상 입금 기록만 표시됩니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load(true)">새로고침</button>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="flex flex-wrap items-center gap-2 text-sm text-slate-200">
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2">총입금: <span class="font-mono">{{ fmt2(summary.totalInUsdt) }}</span> USDT</span>
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2">총출금: <span class="font-mono">{{ fmt2(summary.totalOutUsdt) }}</span> USDT</span>
      </div>

      <div class="mt-3 grid gap-2 md:grid-cols-[220px_180px_minmax(240px,1fr)_120px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="w-full bg-transparent outline-none" />
        </div>
        <select v-model="typeFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유형</option>
          <option value="입금">입금</option>
          <option value="출금">출금</option>
        </select>
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="load(true)">검색</button>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">회원 아이디</th>
              <th class="px-3 py-3 text-left">회원 이름</th>
              <th class="px-3 py-3 text-left">총판 이름</th>
              <th class="px-3 py-3 text-left">입금 유형</th>
              <th class="px-3 py-3 text-right">USDT 금액</th>
              <th class="px-3 py-3 text-left">입금 상태</th>
              <th class="px-3 py-3 text-left">입금 일시</th>
              <th class="px-3 py-3 text-left">처리자</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500">입출금 내역이 없습니다.</td>
            </tr>
            <tr v-for="r in paged" :key="`${r.created_at}-${r.user_id}-${r.amount_usdt}`" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 font-mono text-slate-100">{{ r.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ r.name }}</td>
              <td class="px-3 py-3 text-slate-300">{{ r.affiliateName }}</td>
              <td class="px-3 py-3">{{ r.type }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(r.amount_usdt) }}</td>
              <td class="px-3 py-3">
                <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">{{ r.status }}</span>
              </td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ formatDateTime(r.created_at) }}</td>
              <td class="px-3 py-3 text-slate-300">{{ r.admin }}</td>
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

type TransferRow = {
  type: string
  user_id: number
  username: string
  name: string
  affiliateName: string
  amount_usdt: number
  status: string
  created_at: string
  admin: string
}

const { refresh } = useMe()
await refresh()

const items = ref<TransferRow[]>([])
const summary = ref({ totalInUsdt: 0, totalOutUsdt: 0 })
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const typeFilter = ref('')
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const pageSize = 10

function fmt2(v: number) {
  return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((r) => {
    if (typeFilter.value && r.type !== typeFilter.value) return false
    if (fromDate.value && dateOnly(r.created_at) < fromDate.value) return false
    if (toDate.value && dateOnly(r.created_at) > toDate.value) return false
    if (!q) return true
    return [r.username, r.name, r.affiliateName, r.admin].some((v) => String(v).toLowerCase().includes(q))
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

async function load(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await $fetch<{ items: TransferRow[]; summary: { totalInUsdt: number; totalOutUsdt: number } }>('/api/admin/transfers', {
      query: { limit: 200, offset: 0 }
    })
    items.value = res.items || []
    summary.value = res.summary || { totalInUsdt: 0, totalOutUsdt: 0 }
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '입출금 내역을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load(true).catch(() => {})
})
</script>

