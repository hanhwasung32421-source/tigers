<template>
  <div class="font-landing">
    <LandingPopup />
    <section class="relative overflow-hidden px-6 py-10 sm:px-12 md:px-24 md:py-14">
      <HeroBackdrop />
      <div class="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,780px)]">
        <div>
          <h1 class="text-[36px] font-bold leading-[1.15] tracking-tight text-white md:text-[44px] xl:text-[56px]">
            {{ t('더 안전하고, 더 강력한', 'Safer, more powerful,') }}<br />{{ t('디지털 자산 거래', 'digital asset trading') }}
          </h1>
          <p class="mt-6 text-[19px] leading-8 text-slate-300">
            {{ t('KYC 인증으로 신뢰할 수 있는 보안시스템.', 'A trusted security system backed by KYC verification.') }}<br />
            {{ t('전세계 300개 이상의 레버리지 종목 거래 환경', 'Trade over 300 leveraged instruments worldwide.') }}<br />
            {{ t('지금 시작하세요.', 'Start now') }}
          </p>

          <form class="mt-10 flex max-w-[600px] items-center gap-2 rounded-2xl bg-white/[0.06] p-1.5" @submit.prevent="getStarted">
            <input
              v-model.trim="heroEmail"
              type="email"
              :placeholder="t('이메일', 'Email')"
              class="h-12 min-w-0 flex-1 bg-transparent px-4 text-[18px] text-white outline-none placeholder:text-slate-500"
            />
            <button type="submit" class="h-12 shrink-0 rounded-xl bg-[#f0b90b] px-6 text-[17px] font-semibold text-slate-950 hover:bg-[#d9a609]">
              {{ t('지금 시작하기', 'Get Started Now') }}
            </button>
          </form>

          <div class="mt-12 text-[16px] text-slate-400"><BrandText :text="t(`${appName} 앱 다운로드`, `Download ${appName} APP`)" /></div>
          <div class="mt-4 flex items-center gap-3">
            <NuxtLink :to="appButtonTarget" aria-label="Google Play" class="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.12]">
              <svg viewBox="0 0 24 24" class="h-7 w-7" aria-hidden="true">
                <path fill="#00d2ff" d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2z" />
                <path fill="#ffce00" d="m16.1 15.4-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2z" />
                <path fill="#f43d54" d="m16.2 15.3-3.2-3.2-9.4 9.4c.4.4.9.4 1.6.1l11-6.3" />
                <path fill="#00e07d" d="M16.2 8.9 5.2 2.6c-.7-.4-1.2-.3-1.6.1l9.4 9.4 3.2-3.2z" />
              </svg>
            </NuxtLink>
            <NuxtLink :to="appButtonTarget" aria-label="App Store" class="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.12]">
              <svg viewBox="0 0 24 24" class="h-7 w-7 text-white" fill="currentColor" aria-hidden="true">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
            </NuxtLink>
            <NuxtLink :to="appButtonTarget" aria-label="QR code" class="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white/[0.06] hover:bg-white/[0.12]">
              <svg viewBox="0 0 24 24" class="h-7 w-7 text-white" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
                <path d="M14 14h2.500v2.500H14zM18 14h2.500M14 18.500h2.500M18 18v2.500h2.500" stroke-linecap="round" />
              </svg>
            </NuxtLink>
          </div>
        </div>

        <div class="pb-6">
          <LandingHeroMarkets />
        </div>
      </div>

      <!-- 첫 화면 1파트 하단: 왼쪽으로 돌아가는 AI Trading Signal Radar -->
      <div class="relative z-10 mt-10">
        <SignalRadar />
      </div>
    </section>

    <!-- SECURITY & CONTROL -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 text-center md:px-24">
      <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">SECURITY &amp; CONTROL</div>
      <h2 class="mx-auto mt-4 max-w-xl text-[36px] font-black leading-tight text-white md:text-[43.2px]">{{ t('신뢰할 수 있는 거래 파트너', 'A Trading Partner You Can Trust') }}</h2>
      <div class="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-4">
        <div
          v-for="(item, idx) in securityItems"
          :key="item.title"
          class="flip-card border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"
          :class="[idx === 0 ? 'md:border-l-0 md:pl-0' : '', flippedIdx === idx ? 'is-flipped' : '']"
          @click="flippedIdx = flippedIdx === idx ? -1 : idx"
        >
          <!-- 마우스를 올리면(터치 화면은 탭하면) 가로로 뒤집히면서 같은 뜻의 다른 문장이 나온다 -->
          <div class="flip-inner">
            <div class="flip-face">
              <svg viewBox="0 0 24 24" class="mx-auto h-8 w-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5">
                <path :d="item.path" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="mt-4 text-[19.2px] font-bold text-white">{{ t(item.title, item.titleEn) }}</div>
              <p class="mt-2 text-[16.8px] leading-6 text-slate-400">{{ t(item.desc, item.descEn) }}</p>
            </div>
            <div class="flip-face flip-back">
              <svg viewBox="0 0 24 24" class="mx-auto h-8 w-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5">
                <path :d="item.path" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="mt-4 text-[19.2px] font-bold text-white">{{ t(item.title, item.titleEn) }}</div>
              <p class="mt-2 text-[16.8px] leading-6 text-slate-400">{{ t(item.back, item.backEn) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MARKETS -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <PopularMarkets />
    </section>

    <!-- ASSET SECURITY -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <AssetSecurity />
    </section>

    <!-- 파트5: TOOLS FOR TRADERS -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <ToolsForTraders />
    </section>

    <!-- 파트6: TRADE ANYTIME, ANYWHERE -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <TradeAnywhere />
    </section>

    <!-- 파트7: SECURITY AUDIT -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <SecurityAudit />
    </section>

    <!-- PRODUCTS -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 text-center md:px-24">
      <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">PRODUCTS</div>
      <h2 class="mx-auto mt-4 max-w-2xl text-[36px] font-black leading-tight text-white md:text-[43.2px]">{{ t('거래의 모든 순간이', 'Every moment of trading,') }}<br />{{ t('한 번의 클릭으로', 'just one click away') }}</h2>
      <div class="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="p in products"
          :key="p.title"
          :to="p.to"
          class="group flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.05]"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7 text-white" fill="none" stroke="currentColor" stroke-width="1.6">
            <path :d="p.path" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="mt-5 text-[19.2px] font-bold text-white">{{ t(p.title, p.titleEn) }}</div>
          <p class="mt-2 text-[16.8px] leading-6 text-slate-400">{{ t(p.desc, p.descEn) }}</p>
          <div class="mt-auto pt-4 text-[16.8px] font-semibold text-cyan-300 group-hover:text-cyan-200">{{ t(p.linkText, p.linkTextEn) }} →</div>
        </NuxtLink>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-white/10 px-6 sm:px-12 py-14 md:px-24">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <div>
          <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">FAQ</div>
          <h2 class="mt-4 text-[36px] font-black leading-tight text-white md:text-[43.2px]">{{ t('궁금한 점이', 'Have a') }}<br />{{ t('있으신가요?', 'question?') }}</h2>
          <p class="mt-5 max-w-sm text-[16.8px] leading-7 text-slate-400">
            <BrandText :text="t(`자주 묻는 질문에서 ${appName} 이용에 필요한 핵심 정보를 확인하세요.`, `Check the FAQ for key information about using ${appName}.`)" />
          </p>
          <NuxtLink :to="supportLinkTarget" class="mt-6 inline-block text-[16.8px] font-semibold text-white underline underline-offset-4">
            {{ t('고객지원 바로가기', 'Go to Support') }} →
          </NuxtLink>
        </div>
        <div class="divide-y divide-white/10 border-t border-white/10">
          <div v-for="(item, idx) in faqItems" :key="item.q">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 py-5 text-left text-[16.8px] font-semibold text-slate-100 hover:text-white"
              @click="openFaq = openFaq === idx ? null : idx"
            >
              <BrandText :text="t(item.q, item.qEn)" />
              <span class="shrink-0 text-[21.6px] font-light text-slate-500">{{ openFaq === idx ? '−' : '+' }}</span>
            </button>
            <p v-if="openFaq === idx" class="pb-5 text-[16.8px] leading-7 text-slate-400"><BrandText :text="t(item.a, item.aEn)" /></p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName
const heroEmail = ref('')
// 보안 항목 카드: 터치 화면에서 탭으로 뒤집힌 카드(마우스 화면은 CSS :hover로 뒤집힌다)
const flippedIdx = ref(-1)
// 앱 다운로드 버튼(Google Play / App Store / QR): 로그인 전에는 로그인 화면으로, 로그인하면 삼성전자(SAMSUNGUSDT) 차트로 바로 이동한다.
// (로그인 화면은 로그인에 성공하면 /exchange/SAMSUNGUSDT로 보낸다. 이미 로그인한 상태면 차트로 바로 간다.)
const { me: landingMe } = useMe()
// 고객지원 바로가기: 로그인 전에는 로그인 화면으로, 로그인했다면 고객지원(관리자는 쪽지관리)으로 이동한다.
const supportLinkTarget = computed(() => (!landingMe.value ? '/auth/login' : landingMe.value.role !== 'user' ? '/admin/messages' : '/support'))
const appButtonTarget = computed(() => (landingMe.value ? '/exchange/SAMSUNGUSDT' : '/auth/login'))
function getStarted() {
  // 회원가입 화면에는 이메일 입력칸이 없어서(아이디 기반) 여기서는 가입 화면으로만 이동한다. 이메일은 주소창/서버로 보내지 않는다.
  navigateTo('/auth/register')
}
const { t } = useLocale()

const securityItems = [
  {
    title: '검증된 안정성',
    titleEn: 'Proven Stability',
    desc: '시장 변화 속에서도 계정과 주문 상태를 명확하게 확인할 수 있도록 설계했습니다.',
    descEn: 'Designed so you can always clearly see your account and order status, even amid market swings.',
    back: '시장이 크게 출렁여도 내 계정과 주문 상태를 한눈에 알아볼 수 있도록 만들었습니다.',
    backEn: 'Built so your account and order status stay easy to read at a glance, even when the market gets volatile.',
    path: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zm-3 9 2 2 4-4'
  },
  {
    title: '투명한 자산 운영',
    titleEn: 'Transparent Asset Management',
    desc: '펀딩 지갑과 거래 지갑의 흐름을 구분하고 모든 이동 내역을 한곳에서 추적합니다.',
    descEn: 'Funding and trading wallet flows are kept separate, with every transfer tracked in one place.',
    back: '펀딩 잔고와 거래 잔고를 서로 다른 지갑으로 나누어 관리하고, 지갑 간 이동은 하나의 화면에서 기록을 따라가며 확인할 수 있습니다.',
    backEn: 'Funding and trading balances live in separate wallets, and each movement between them is recorded and easy to follow in one view.',
    path: 'M4 21V10l8-6 8 6v11M9 21v-6h6v6'
  },
  {
    title: '간편한 입출금',
    titleEn: 'Easy Deposits & Withdrawals',
    desc: '복잡한 단계를 줄이고, 처리 상태와 필요한 다음 행동을 분명하게 안내합니다.',
    descEn: 'Fewer steps, with clear guidance on processing status and what to do next.',
    back: '거쳐야 할 단계는 줄이고, 요청이 어디까지 진행됐는지와 다음에 할 일을 명확히 알려 드립니다.',
    backEn: 'Fewer steps to go through, plus clear updates on where your request stands and what comes next.',
    path: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm4 3 4 4 4-4M12 7v7'
  },
  {
    title: '빠른 본인 인증',
    titleEn: 'Fast Identity Verification',
    desc: '필요한 인증 단계를 확인하고 거래에 필요한 보안 설정까지 이어서 완료하세요.',
    descEn: 'Check the required verification steps and complete the security settings you need to trade.',
    back: '필요한 인증 절차를 확인하고, 거래에 필요한 보안 설정과 함께 한 번에 마무리하세요.',
    backEn: 'See which verification steps are needed, then finish them together with the security settings required for trading.',
    path: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5zm3 4h4M8 13h8M8 17h5'
  }
]

const products = [
  {
    title: '선물거래',
    titleEn: 'Futures Trading',
    desc: '실시간 차트와 주문창으로 주요 무기한 선물을 정교하게 거래하세요.',
    descEn: 'Trade major perpetual futures precisely with real-time charts and an order panel.',
    linkText: '거래하기',
    linkTextEn: 'Trade Now',
    to: '/exchange/SAMSUNGUSDT',
    path: 'M4 19V5m5 14V9m5 10V7m5 12V11'
  },
  {
    title: '주요 마켓',
    titleEn: 'Key Markets',
    desc: '암호화폐와 주요 종목의 가격 흐름을 한눈에 비교하세요.',
    descEn: 'Compare price movements across crypto and major instruments at a glance.',
    linkText: '마켓 보기',
    linkTextEn: 'View Markets',
    to: '/exchange/SAMSUNGUSDT',
    path: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z'
  },
  {
    title: '자산 관리',
    titleEn: 'Asset Management',
    desc: '펀딩과 거래 지갑을 분리해 잔액, 이동, 손익을 한 흐름으로 관리하세요.',
    descEn: 'Separate funding and trading wallets to manage balances, transfers, and P&L in one flow.',
    linkText: '지갑 보기',
    linkTextEn: 'View Wallet',
    to: '/wallet',
    path: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14 5h-3a1.5 1.5 0 0 0 0 3h3'
  },
  {
    title: '손익 분석',
    titleEn: 'P&L Analysis',
    desc: '실현 손익과 수수료 흐름을 거래 내역에서 명확하게 확인하세요.',
    descEn: 'Clearly review realized P&L and fee flows in your trade history.',
    linkText: 'P&L 확인',
    linkTextEn: 'Check P&L',
    to: '/invest/trades',
    path: 'M4 19V5m5 14V9m5 10V7m5 12V11'
  }
]

const openFaq = ref<number | null>(null)
const faqItems = [
  {
    q: `${appName}에서는 어떤 상품을 이용할 수 있나요?`,
    qEn: `What products are available on ${appName}?`,
    a: '무기한 선물 거래를 중심으로, 격리 마진과 다양한 레버리지 설정을 지원합니다.',
    aEn: 'Mainly perpetual futures trading, with isolated margin and a range of leverage settings.'
  },
  {
    q: '처음 거래를 시작하려면 무엇이 필요한가요?',
    qEn: 'What do I need to start trading for the first time?',
    a: '회원가입 후 내 지갑에서 입금 요청을 하면, 승인 즉시 거래에 사용할 수 있습니다.',
    aEn: 'Sign up and submit a deposit request from My Wallet — funds are usable as soon as it is approved.'
  },
  {
    q: '내 자산과 거래 내역은 어디에서 확인하나요?',
    qEn: 'Where can I check my assets and trade history?',
    a: '상단 메뉴의 내 지갑과 투자내역에서 잔액, 입출금, 거래 내역을 확인할 수 있습니다.',
    aEn: 'Check balances, deposits/withdrawals, and trade history under My Wallet and Investment History in the top menu.'
  },
  {
    q: '문제가 생기면 어떻게 도움을 받을 수 있나요?',
    qEn: 'How can I get help if something goes wrong?',
    a: '우측 하단 실시간 상담이나 상단 고객센터를 통해 도움을 받을 수 있습니다.',
    aEn: 'Reach the operator directly via the live chat in the bottom right or Support in the top menu.'
  }
]
</script>
