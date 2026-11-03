<template>
  <nav
    v-if="visible"
    class="site-header mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] border-t border-cyan-500/10 bg-[#020b16]/95 backdrop-blur md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
    :aria-label="t('하단 메뉴', 'Bottom menu')"
  >
    <ul class="grid grid-cols-5">
      <li v-for="item in items" :key="item.key">
        <button
          type="button"
          class="flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:bg-white/5"
          :class="item.disabled ? 'cursor-not-allowed opacity-40 text-slate-500' : item.active ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
          :disabled="item.disabled"
          :aria-current="item.active ? 'page' : undefined"
          @click="go(item)"
        >
          <svg viewBox="0 0 24 24" class="h-[22px] w-[22px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="item.icon" />
          <span class="leading-none">{{ t(item.ko, item.en) }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// 모바일 하단 메뉴: 첫 화면부터 항상 보이고, 누르면 로그인 전에는 로그인 화면으로, 로그인 후에는 해당 메뉴로 간다.
// 고객센터는 어드민 "정산/기타 설정"의 텔레그램 링크가 있으면 그 링크로, 비어 있으면 사이트 안 쪽지(고객센터)로 간다.
const route = useRoute()
const { t } = useLocale()
const { me } = useMe()
const visible = useBottomNavVisible()

// 어드민이 정한 고객센터 링크(비어 있으면 서버가 '/support'를 돌려준다).
const supportUrl = ref('/support')
onMounted(async () => {
  try {
    const res = await $fetch<{ telegramUrl: string }>('/api/settings/telegram')
    supportUrl.value = String(res?.telegramUrl || '/support')
  } catch {
    supportUrl.value = '/support'
  }
})

const KR_TICKERS = ['SAMSUNG', 'SKHYNIX', 'SKHY', 'EWY', 'KORU', 'KR200']
const isKrExchange = computed(() => {
  const m = route.path.match(/^\/exchange\/([A-Za-z0-9]+)/)
  if (!m) return false
  return KR_TICKERS.includes(String(m[1]).toUpperCase().replace(/USDT$/, ''))
})
const isAdmin = computed(() => !!me.value?.role && me.value.role !== 'user')

const ICONS = {
  futures: '<path d="M5 20V10M12 20V4M19 20v-7" />',
  leverage: '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7z" />',
  wallet: '<rect x="3" y="7" width="18" height="13" rx="2" /><path d="M4 7a2 2 0 0 1 2-2h11v2" /><path d="M16.5 13.5h2" />',
  invest: '<path d="M7 3h8l4 4v14H7z" /><path d="M10 15l2-2 2 2 3-3" />',
  support: '<circle cx="12" cy="12" r="9" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8" /><path d="M12 17h.01" />'
}

const items = computed(() => [
  { key: 'futures', ko: '선물거래', en: 'Futures', icon: ICONS.futures, to: '/exchange/BTCUSDT', active: route.path.startsWith('/exchange') && !isKrExchange.value, disabled: false },
  { key: 'leverage', ko: '레버리지', en: 'Leverage', icon: ICONS.leverage, to: '/exchange/SAMSUNGUSDT', active: isKrExchange.value, disabled: false },
  { key: 'wallet', ko: '내 지갑', en: 'Wallet', icon: ICONS.wallet, to: '/wallet', active: route.path.startsWith('/wallet'), disabled: false },
  { key: 'invest', ko: '투자내역', en: 'History', icon: ICONS.invest, to: '/invest/trades', active: route.path.startsWith('/invest'), disabled: false },
  { key: 'support', ko: '고객센터', en: 'Support', icon: ICONS.support, to: '/support', active: route.path.startsWith('/support') || route.path === '/admin/messages', disabled: false }
])

function go(item: { key: string; to: string; disabled: boolean }) {
  if (item.disabled) return
  // 로그인 전에는 어느 메뉴를 눌러도 로그인 화면으로 간다.
  if (!me.value) {
    navigateTo('/auth/login')
    return
  }
  if (item.key === 'support') {
    if (/^(https?:\/\/|tg:\/\/)/i.test(supportUrl.value)) {
      window.open(supportUrl.value, '_blank', 'noopener')
      return
    }
    navigateTo(isAdmin.value ? '/admin/messages' : '/support')
    return
  }
  navigateTo(item.to)
}
</script>
