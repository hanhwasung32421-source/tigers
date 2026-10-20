<template>
  <!-- 처음 접속(브라우저 탭당 한 번)에 흰 화면 가운데 KTX 로고가 뜨고, 문구가 차례로 페이드인/아웃된 뒤 홈페이지가 나타난다. 화면을 누르면 바로 건너뛴다. -->
  <div v-if="show" class="splash" :class="{ 'splash-out': leaving }" role="presentation" @click="finish">
    <div class="splash-inner">
      <img src="/brand-logo.png" alt="" class="splash-logo" />
      <div class="splash-text splash-t1">{{ t('세계 랭킹 거래소', 'World Ranking Exchange') }}</div>
      <div class="splash-text splash-t2">{{ t('더 안전하고, 더 강력한 디지털 자산 거래', 'Safer, more powerful, digital asset trading') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const SEEN_KEY = 'ktx_splash_seen'
const show = ref(true) // 서버가 만든 HTML에도 스플래시가 들어 있어야 카드가 먼저 보였다가 가려지는 번쩍임이 없다
const leaving = ref(false)
let t1: any = null
let t2: any = null

function finish() {
  if (!show.value || leaving.value) return
  leaving.value = true
  if (t1) clearTimeout(t1)
  t2 = setTimeout(() => {
    show.value = false
  }, 600)
}

onMounted(() => {
  let seen = false
  try {
    seen = !!sessionStorage.getItem(SEEN_KEY)
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // 저장소를 못 쓰면 매번 보여준다
  }
  if (seen) {
    show.value = false
    return
  }
  t1 = setTimeout(finish, 3400)
})
onBeforeUnmount(() => {
  if (t1) clearTimeout(t1)
  if (t2) clearTimeout(t2)
})
</script>
