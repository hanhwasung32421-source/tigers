<template>
  <div class="fixed bottom-4 right-4 z-[150] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-5 sm:right-5">
    <Transition name="guest-chat-panel">
      <div
        v-if="open"
        class="flex h-[440px] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f16] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <div class="text-sm font-semibold text-white">{{ t('실시간 상담', 'Live Chat') }}</div>
            <div class="text-[11px] text-slate-500">{{ t('가입 없이도 바로 문의할 수 있어요', 'Ask us anything, no sign-up needed') }}</div>
          </div>
          <button type="button" class="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white" @click="open = false">✕</button>
        </div>

        <div ref="listEl" class="min-h-0 flex-1 space-y-2.5 overflow-auto px-3 py-3">
          <div v-if="messages.length === 0" class="py-8 text-center text-xs text-slate-500">
            {{ t('아직 대화가 없습니다.', 'No messages yet.') }}<br />{{ t('궁금한 점을 남겨주시면 운영자가 답변드립니다.', 'Leave your question and our team will reply.') }}
          </div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-5"
            :class="m.sender === 'guest' ? 'ml-auto bg-cyan-500/20 text-slate-100' : 'bg-white/5 text-slate-200'"
          >
            <div class="whitespace-pre-wrap">{{ m.body }}</div>
          </div>
        </div>

        <div class="border-t border-white/10 p-2.5">
          <div class="flex items-end gap-2">
            <textarea
              v-model.trim="draft"
              rows="1"
              class="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-white/10 bg-[#050810] px-3 py-2 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
              :placeholder="t('메시지를 입력하세요', 'Type a message')"
              @keydown.enter.exact.prevent="send"
            />
            <button
              type="button"
              class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="sending || !draft"
              @click="send"
            >
              ➤
            </button>
          </div>
          <p v-if="error" class="mt-1.5 text-[11px] text-rose-300">{{ error }}</p>
        </div>
      </div>
    </Transition>

    <button
      type="button"
      class="font-landing flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2.5 text-[13px] font-bold text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition hover:bg-slate-100 sm:gap-2 sm:px-4 sm:py-3 sm:text-[15.4px]"
      @click="toggle"
    >
      <span class="text-base">💬</span>
      {{ t('실시간 상담', 'Live Chat') }}
    </button>
  </div>
</template>

<script setup lang="ts">
type GuestMessage = { id: number; sender: 'guest' | 'admin'; body: string; createdAt: string }

const { t } = useLocale()
const STORAGE_KEY = 'usdetrade_guest_chat_id'

const open = ref(false)
const messages = ref<GuestMessage[]>([])
const draft = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const listEl = ref<HTMLElement | null>(null)
let pollTimer: any = null
let guestId = ''

function ensureGuestId() {
  if (guestId) return guestId
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      guestId = saved
      return guestId
    }
  } catch {
    // ignore
  }
  guestId = `guest-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)}`
  try {
    localStorage.setItem(STORAGE_KEY, guestId)
  } catch {
    // ignore
  }
  return guestId
}

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

async function loadThread() {
  try {
    const res = await $fetch<{ items: GuestMessage[] }>('/api/guest-chat/thread', { query: { guestId: ensureGuestId() } })
    messages.value = res.items || []
    scrollToBottom()
  } catch {
    // ignore
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  error.value = null
  try {
    const res = await $fetch<{ items: GuestMessage[] }>('/api/guest-chat/send', {
      method: 'POST',
      body: { guestId: ensureGuestId(), body: text }
    })
    messages.value = res.items || []
    draft.value = ''
    scrollToBottom()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('전송에 실패했습니다.', 'Failed to send.')
  } finally {
    sending.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (open.value) loadThread()
  }, 4000)
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

async function toggle() {
  open.value = !open.value
  if (open.value) await loadThread()
}

onMounted(() => {
  ensureGuestId()
  startPolling()
})
onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.guest-chat-panel-enter-active,
.guest-chat-panel-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.guest-chat-panel-enter-from,
.guest-chat-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
