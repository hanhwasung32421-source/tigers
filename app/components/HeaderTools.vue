<template>
  <div class="flex items-center gap-0.5 text-slate-300">
    <!-- 언어(지구본) -->
    <button
      ref="langBtn"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      :class="langOpen ? 'bg-white/10 text-white' : ''"
      aria-label="Language"
      @click="toggleLang"
    >
      <svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" />
      </svg>
    </button>

    <!-- 테마(해/달) -->
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      :aria-label="theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'"
      @click="toggleTheme"
    >
      <span v-if="!mounted" class="block h-[19px] w-[19px]" />
      <svg v-else-if="theme === 'light'" viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    </button>

    <!-- 알림(종) -->
    <NuxtLink
      v-if="me && showBell"
      :to="bellTarget"
      class="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
      aria-label="Notifications"
    >
      <svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      <span v-if="unread > 0" class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#020b16]" />
    </NuxtLink>

    <!-- 언어 목록: 헤더(overflow/stacking)에 가려지지 않도록 body에 띄운다 -->
    <Teleport to="body">
      <div
        v-if="langOpen"
        ref="langPanel"
        class="fixed z-[200] w-[230px] rounded-xl border border-white/10 bg-[#0b1220] py-2 text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
      >
        <div class="px-4 pb-1 pt-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Language</div>
        <div class="max-h-[70vh] overflow-y-auto">
          <button
            v-for="l in LANGUAGES"
            :key="l.code"
            type="button"
            class="block w-full px-4 py-2.5 text-center text-[14px] hover:bg-white/5"
            :class="lang === l.code ? 'font-bold text-amber-400' : 'text-slate-200'"
            @click="pick(l.code)"
          >
            {{ l.label }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ bellTarget?: string; showBell?: boolean }>(), { bellTarget: '/support', showBell: true })

const { me } = useMe()
const { unread } = useMessages()
const { lang, setLang } = useLocale()
const { theme, toggleTheme } = useTheme()

const mounted = ref(false)
const langOpen = ref(false)
const langBtn = ref<HTMLElement | null>(null)
const langPanel = ref<HTMLElement | null>(null)
const panelPos = ref({ top: 0, left: 0 })

function toggleLang() {
  if (langOpen.value) {
    langOpen.value = false
    return
  }
  const r = langBtn.value?.getBoundingClientRect()
  if (r) panelPos.value = { top: r.bottom + 8, left: Math.max(8, Math.min(r.right - 230, window.innerWidth - 238)) }
  langOpen.value = true
}

async function pick(code: any) {
  await setLang(code)
  langOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!langOpen.value) return
  const t = e.target as Node
  if (langBtn.value?.contains(t) || langPanel.value?.contains(t)) return
  langOpen.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') langOpen.value = false
}

onMounted(() => {
  mounted.value = true
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>
