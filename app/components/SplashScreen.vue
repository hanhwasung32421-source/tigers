<template>
  <!-- 처음 접속(브라우저 탭당 한 번)에 흰 화면 가운데 KTX 로고가 뜨고, 로딩되는 동안 문구가 계속 돌아가며 나온다.
       첫 화면 준비가 끝나면 문구가 사라지고 같은 자리에 "Human verified ✓"가 뜬 뒤 0.5초 후 홈페이지가 나타난다. 화면을 누르면 바로 건너뛴다. -->
  <div v-if="show" class="splash" :class="{ 'splash-out': leaving }" role="presentation" @click="finish">
    <div class="splash-inner">
      <img src="/brand-logo.png" alt="" class="splash-logo" />
      <div class="splash-slot">
        <Transition name="splash-msg" mode="out-in">
          <div v-if="!verified" :key="idx" class="splash-msg" :class="messages[idx].cls">
            <span v-if="messages[idx].spin" class="splash-spin" />
            <svg v-if="messages[idx].lock" class="splash-lock" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span>{{ messages[idx].text }}</span>
          </div>
          <div v-else key="verified" class="splash-msg splash-verified">
            <svg class="splash-vok" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="splash-vok-ring" cx="12" cy="12" r="10" />
              <path class="splash-vok-tick" d="M7 12.5l3.4 3.4L17 9" />
            </svg>
            <span>Human verified</span>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { items: marketItems } = useMarketOverview()
const SEEN_KEY = 'ktx_splash_seen'
const MIN_SHOW_MS = 3000 // 보안 연결 문구 → World Ranking Exchange 순서가 읽히도록
const MAX_SHOW_MS = 12000 // 로딩이 아주 오래 걸려도 이 시간이 지나면 넘어간다
const MSG_MS = 1000 // 문구 사이 간격(1초)
const VERIFIED_HOLD_MS = 850 // Human verified가 나타난 뒤 홈페이지로 넘어가기까지(전환 0.35초 + 0.5초)
const show = ref(true) // 서버가 만든 HTML에도 스플래시가 들어 있어야 카드가 먼저 보였다가 가려지는 번쩍임이 없다
const leaving = ref(false)
const verified = ref(false)
const idx = ref(0)

const messages = computed(() => [
  { text: 'Establishing secure HTTPS connection…', cls: 'splash-check', spin: false, lock: true },
  { text: 'World Ranking Exchange', cls: 'splash-slogan splash-s1', spin: false },
  { text: 'Safer, more powerful, digital asset trading', cls: 'splash-slogan splash-s2', spin: false },
  { text: 'Security check in progress…', cls: 'splash-check', spin: true },
  { text: 'Trade over 300 leveraged instruments worldwide.', cls: 'splash-slogan splash-s3', spin: false },
  { text: 'Verifying you are human…', cls: 'splash-check', spin: true }
])

let rotateTimer: any = null
let readyTimer: any = null
let doneTimer: any = null
let outTimer: any = null
let startedAt = 0

function finish() {
  if (!show.value || leaving.value) return
  leaving.value = true
  if (rotateTimer) clearInterval(rotateTimer)
  if (readyTimer) clearInterval(readyTimer)
  if (doneTimer) clearTimeout(doneTimer)
  outTimer = setTimeout(() => {
    show.value = false
  }, 600)
}

// 첫 화면 카드(종목 시세)가 만들어지고 페이지 리소스 로딩이 끝나면 "준비 완료"
function isReady() {
  return marketItems.value.length > 0 && document.readyState === 'complete'
}

function markVerified() {
  if (verified.value || leaving.value) return
  verified.value = true
  if (rotateTimer) clearInterval(rotateTimer)
  if (readyTimer) clearInterval(readyTimer)
  doneTimer = setTimeout(finish, VERIFIED_HOLD_MS)
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
  startedAt = Date.now()
  // 로딩되는 동안 문구가 계속 돌아간다(스플래시는 언어와 상관없이 항상 영어)
  rotateTimer = setInterval(() => {
    idx.value = (idx.value + 1) % messages.value.length
  }, MSG_MS)
  readyTimer = setInterval(() => {
    const elapsed = Date.now() - startedAt
    if ((elapsed >= MIN_SHOW_MS && isReady()) || elapsed >= MAX_SHOW_MS) markVerified()
  }, 150)
})
onBeforeUnmount(() => {
  if (rotateTimer) clearInterval(rotateTimer)
  if (readyTimer) clearInterval(readyTimer)
  if (doneTimer) clearTimeout(doneTimer)
  if (outTimer) clearTimeout(outTimer)
})
</script>
