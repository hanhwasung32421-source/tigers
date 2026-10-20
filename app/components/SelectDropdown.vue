<template>
  <div ref="root" class="relative inline-block">
    <button
      type="button"
      class="flex items-center gap-2 rounded-md bg-slate-950/60 px-3 py-1 text-xs text-slate-100 ring-1 ring-emerald-400/40 hover:bg-slate-950/75"
      @click="toggle"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <span class="text-slate-300">▼</span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+6px)] z-50 max-h-80 min-w-full overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-slate-950 shadow-lg"
    >
      <!-- 종목 검색: 글자를 쓰면 바로 그 글자가 들어간 항목만 남긴다 -->
      <div v-if="searchable" class="sticky top-0 z-10 border-b border-white/10 bg-slate-950 p-2">
        <input
          ref="searchEl"
          v-model="query"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :placeholder="searchPlaceholder || 'Search'"
          class="w-full rounded bg-white/5 px-2 py-1.5 text-xs text-slate-100 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-emerald-400/50"
          @keydown.enter.prevent="selectFirst"
          @keydown.esc="open = false"
        />
      </div>
      <div v-if="searchable && filteredOptions.length === 0" class="px-3 py-3 text-center text-xs text-slate-500">—</div>
      <button
        v-for="opt in filteredOptions"
        :key="opt.value"
        type="button"
        class="block w-full px-3 py-2 text-left text-xs"
        :class="opt.value === modelValue ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-white/5'"
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type Opt = { value: string; label: string }

const props = defineProps<{
  modelValue: string
  options: Opt[]
  searchable?: boolean
  searchPlaceholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', v: string): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)
const query = ref('')

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!props.searchable || !q) return props.options || []
  return (props.options || []).filter((o) => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
})

function toggle() {
  open.value = !open.value
}
// 열릴 때마다 검색어를 비우고 검색창에 바로 입력할 수 있게 포커스를 준다.
watch(open, (v) => {
  if (!v) return
  query.value = ''
  if (props.searchable) nextTick(() => searchEl.value?.focus())
})

function selectFirst() {
  const first = filteredOptions.value[0]
  if (first) select(first.value)
}

const selectedLabel = computed(() => {
  const hit = (props.options || []).find((o) => o.value === props.modelValue)
  return hit?.label || props.modelValue
})

function select(v: string) {
  emit('update:modelValue', v)
  emit('change', v)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  const el = root.value
  if (!el) return
  if (!open.value) return
  const t = e.target as Node | null
  if (t && el.contains(t)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick, { capture: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, { capture: true } as any)
})
</script>

