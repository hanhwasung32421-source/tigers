<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 py-6" @click.self="close">
      <div class="relative flex max-h-full w-full max-w-[460px] flex-col overflow-auto rounded-2xl border border-cyan-500/15 bg-[#0b1220] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <a href="https://coinmarketcap.com/rankings/exchanges/derivatives/" target="_blank" rel="noopener noreferrer" class="block">
          <img src="/marketcap-ranking.png" alt="Market cap ranking" class="w-full rounded-xl border border-white/10 object-contain" />
        </a>
        <div class="mt-5 text-center">
          <p class="text-[16px] font-semibold leading-7 text-white">
            {{ t('여러분의 성원으로 드디어 마켓캡 랭킹 등재에 성공했습니다.', 'We have finally succeeded in being listed in the Market Cap ranking, thanks to your support.') }}
          </p>
          <p class="mt-1 text-[15px] leading-7 text-slate-300">
            {{ t('모든 회원분들께 감사드립니다.', 'Thank you to all our members.') }}
          </p>
          <p class="mt-3 text-[15px] font-semibold text-slate-300">{{ t('- KTX 일동 -', '- The KTX Team -') }}</p>
        </div>
        <div class="mt-6 flex flex-col gap-2">
          <button type="button" class="w-full rounded-lg bg-white/10 py-3 text-[15px] font-medium text-slate-200 hover:bg-white/20" @click="dontShowAgain">
            {{ t('다시보지않기', "Don't show again") }}
          </button>
          <button type="button" class="w-full rounded-lg bg-[#f0b90b] py-3 text-[16px] font-medium text-[#383A3E] hover:bg-[#d9a609]" @click="close">
            {{ t('닫기', 'Close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// 첫 화면 접속 시 뜨는 안내 팝업. "다시보지않기"는 쿠키에 저장해서 이 컴퓨터(브라우저)에서는 다시 띄우지 않는다.
const { t } = useLocale()
const COOKIE_NAME = 'ktx_hide_ranking_popup'
const open = ref(false)

// 같은 접속(새로고침 전)에서 닫은 뒤 첫 화면으로 다시 돌아와도 또 뜨지 않게 한다.
let closedThisLoad = false

function isHidden() {
  try {
    return document.cookie.split('; ').some((c) => c === `${COOKIE_NAME}=1`)
  } catch {
    return false
  }
}

function close() {
  open.value = false
  closedThisLoad = true
}

function dontShowAgain() {
  try {
    document.cookie = `${COOKIE_NAME}=1; max-age=${60 * 60 * 24 * 365 * 5}; path=/; SameSite=Lax`
  } catch {
    // 쿠키를 쓸 수 없는 환경이면 이번에만 닫는다
  }
  close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => {
  if (!closedThisLoad && !isHidden()) open.value = true
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})
</script>
