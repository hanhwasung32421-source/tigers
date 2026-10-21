<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">{{ t('고객센터', 'Support') }}</h1>
      <p class="mt-2 text-sm text-slate-400">{{ t('고객센터와 쪽지를 주고받을 수 있습니다.', 'Exchange messages with Support.') }}</p>
    </div>

    <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">{{ t('쪽지함', 'Inbox') }}</h2>
          <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadThreads">{{ t('새로고침', 'Refresh') }}</button>
        </div>

        <div class="mt-4 max-h-[680px] space-y-2 overflow-auto">
          <button
            v-for="thread in threads"
            :key="thread.threadKey"
            class="w-full rounded-xl border px-3 py-3 text-left transition"
            :class="activeThread?.threadKey === thread.threadKey ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'"
            @click="openThread(thread)"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="font-medium text-slate-100">{{ t('고객센터', 'Support') }}</div>
              <span v-if="thread.unreadCount" class="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                {{ thread.unreadCount }}
              </span>
            </div>
            <div class="mt-1 line-clamp-1 text-xs text-slate-400">{{ thread.lastMessage || t('대화 없음', 'No conversation') }}</div>
            <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(thread.lastAt) }}</div>
          </button>
          <div v-if="threads.length === 0" class="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
            {{ t('받은 쪽지가 없습니다.', 'No messages received.') }}
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="border-b border-white/10 pb-4">
          <div class="text-base font-semibold text-slate-100">{{ t('고객센터', 'Support') }}</div>
          <div class="mt-1 text-sm text-slate-400">{{ t('문의 내용과 답장을 이곳에서 확인할 수 있습니다.', 'View your inquiries and replies here.') }}</div>
        </div>

        <div class="mt-4 max-h-[440px] space-y-3 overflow-auto pr-1">
          <div
            v-for="message in activeMessages"
            :key="message.id"
            class="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
            :class="message.sender_id === me?.id ? 'ml-auto bg-cyan-500/15 text-slate-100' : 'bg-white/5 text-slate-200'"
          >
            <div class="mb-1 text-[11px] text-slate-400">
              {{ message.senderName }}<span v-if="message.senderUsername && message.senderName === '관리자'"> ({{ message.senderUsername }})</span>
            </div>
            <div class="whitespace-pre-wrap leading-6">{{ message.body }}</div>
            <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(message.created_at) }}</div>
          </div>
          <div v-if="activeMessages.length === 0" class="py-10 text-center text-sm text-slate-500">{{ t('아직 쪽지가 없습니다. 아래에서 새 문의를 보낼 수 있습니다.', 'No messages yet. You can send a new inquiry below.') }}</div>
        </div>

        <div class="mt-5 border-t border-white/10 pt-4">
          <input
            v-model.trim="subject"
            class="mb-3 w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            :placeholder="t('제목', 'Subject')"
            :key="`support-subject-${locale}`"
          />
          <textarea
            v-model.trim="body"
            rows="5"
            class="w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            :placeholder="t('고객센터에 보낼 내용을 입력하세요', 'Enter the message you want to send to Support')"
            :key="`support-body-${locale}`"
          />
          <div class="mt-3 flex items-center justify-end">
            <button
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="sending || !body"
              @click="sendMessage"
            >
              {{ sending ? t('전송 중...', 'Sending...') : t('보내기', 'Send') }}
            </button>
          </div>
          <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
          <p v-if="okText" class="mt-3 text-sm text-emerald-300">{{ okText }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { t, locale } = useLocale()

type ThreadSummary = {
  threadKey: string
  userId: number
  username: string
  lastMessage: string
  lastAt: string
  unreadCount: number
  subject: string
}
type MessageItem = {
  id: number
  sender_id: number
  senderName: string
  senderUsername?: string
  body: string
  created_at: string
}

const { me, refresh } = useMe()
await refresh()
const { refreshUnread } = useMessages()

const threads = ref<ThreadSummary[]>([])
const activeThread = ref<ThreadSummary | null>(null)
const activeMessages = ref<MessageItem[]>([])
const subject = ref('')
const body = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v || ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

// SSR(주소창 직접 접속/새로고침)에서는 브라우저 쿠키가 자동으로 전달되지 않으므로 명시적으로 넘겨야
// 로그인 상태인데도 쪽지 API가 401로 실패하는 문제를 막을 수 있다.
function ssrHeaders() {
  return import.meta.server ? useRequestHeaders(['cookie']) : undefined
}

async function loadThreads() {
  const res = await $fetch<{ items: ThreadSummary[] }>('/api/messages/threads', { headers: ssrHeaders(), credentials: 'include' })
  threads.value = res.items || []
  if (!activeThread.value && threads.value.length) {
    await openThread(threads.value[0], false)
  }
}

async function openThread(thread: ThreadSummary, refreshList = true) {
  activeThread.value = thread
  const res = await $fetch<{ items: MessageItem[] }>('/api/messages/thread', { headers: ssrHeaders(), credentials: 'include' })
  activeMessages.value = res.items || []
  await $fetch('/api/messages/mark-read', { method: 'POST', body: {} }).catch(() => {})
  await refreshUnread()
  if (refreshList) await loadThreads()
}

async function sendMessage() {
  if (!body.value.trim()) return
  sending.value = true
  error.value = null
  okText.value = null
  try {
    await $fetch('/api/messages/send', {
      method: 'POST',
      body: {
        subject: subject.value.trim(),
        body: body.value.trim()
      }
    })
    subject.value = ''
    body.value = ''
    okText.value = t('쪽지를 보냈습니다.', 'Message sent.')
    await loadThreads()
    if (threads.value[0]) await openThread(threads.value[0], false)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('쪽지를 보내지 못했습니다.', 'Failed to send message.')
  } finally {
    sending.value = false
  }
}

// 관리자 계정은 회원용 고객지원 화면(내 쪽지함)이 없다. 대화 상대(userId) 없이 대화를 불러오면 서버가 400을 돌려주므로,
// 관리자는 쪽지관리 화면으로 보내고 이 화면의 쪽지 불러오기는 건너뛴다.
if (me.value && me.value.role !== 'user') {
  await navigateTo('/admin/messages')
} else {
  await loadThreads()
  await refreshUnread()
}
</script>
