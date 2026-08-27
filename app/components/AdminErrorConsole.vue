<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-[200] border-t border-rose-500/30 bg-[#0b0510]/97 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-start gap-3">
        <div class="mt-0.5 text-rose-400">⚠</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs text-rose-300">
            <span class="font-semibold">최근 오류 (총관리자 전용)</span>
            <span class="text-slate-500">{{ error?.at }}</span>
          </div>
          <pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-200">{{ text }}</pre>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="copy">
            {{ copied ? '복사됨!' : '복사' }}
          </button>
          <button class="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15" @click="dismiss">✕</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ClientErrorEntry } from '../plugins/error-reporter.client'

const { me } = useMe()
const lastError = useState<ClientErrorEntry | null>('client_last_error', () => null)
const dismissedAt = ref<string | null>(null)

const isSuperAdmin = computed(() => me.value?.role === 'super_admin')
const error = computed(() => lastError.value)
const visible = computed(() => isSuperAdmin.value && !!error.value && error.value.at !== dismissedAt.value)

const text = computed(() => {
  if (!error.value) return ''
  const { at, ...rest } = error.value
  return JSON.stringify(rest, null, 2)
})

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // ignore
  }
}

function dismiss() {
  dismissedAt.value = error.value?.at || null
}
</script>
