<template>
  <Teleport to="body">
    <Transition name="launch-notice">
      <div v-if="open" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" @click="hide">
        <div class="w-full max-w-[360px] rounded-2xl border border-black/10 bg-white px-6 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]" @click.stop>
          <div class="text-[20px] font-bold text-[#1e2329]">{{ t('27년 2월 출시 예정', 'Launching February 2027') }}</div>
          <button type="button" class="mt-5 w-full rounded-lg bg-[#f0b90b] py-2.5 text-[15px] font-medium text-[#383A3E] hover:bg-[#d9a609]" @click="hide">
            {{ t('확인', 'OK') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useLocale()
const { open, hide } = useLaunchNotice()
let timer: any = null
watch(open, (v) => {
  if (timer) clearTimeout(timer)
  // 몇 초 뒤 자동으로 닫힌다(누르거나 Esc로도 닫힘)
  if (v) timer = setTimeout(hide, 3500)
})
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) hide()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.launch-notice-enter-active,
.launch-notice-leave-active {
  transition: opacity 0.2s ease;
}
.launch-notice-enter-from,
.launch-notice-leave-to {
  opacity: 0;
}
</style>
