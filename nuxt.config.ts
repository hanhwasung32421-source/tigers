// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      // 이 메타 태그가 없으면 모바일 브라우저가 화면 폭 대신 임의의 넓은(약 980px) 가상 뷰포트로
      // 렌더링한 뒤 축소해서 보여주기 때문에, 손가락으로 옆으로 밀면 화면이 움직이는 문제가 생긴다.
      // width=device-width로 실제 기기 폭에 딱 맞춰 렌더링하게 한다.
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png?v=2' }],
      // 처음 방문(저장된 테마 없음)은 화이트 테마. 첫 화면이 어둡게 번쩍이지 않도록 렌더 전에 <html>에 클래스를 정해둔다.
      htmlAttrs: { class: 'theme-light' },
      script: [
        {
          innerHTML:
            "(function(){var d=document.documentElement;try{var l=localStorage.getItem('bitduck_theme_v2')!=='dark',p=location.pathname,h=p==='/'||p==='/markets'||p.indexOf('/auth/')===0||p.indexOf('/legal')===0;d.classList.toggle('theme-light',l);d.classList.toggle('theme-native',l&&h);d.classList.toggle('theme-filter',l&&!h)}catch(e){d.classList.add('theme-light','theme-filter')}})()",
          tagPosition: 'head'
        }
      ]
    }
  },
  nitro: {
    routeRules: {
      // 배포 후에도 오래된 HTML이 캐시되어 "없는 _nuxt 청크"를 요청하는 문제를 줄입니다.
      // - HTML/페이지 응답: 캐시 금지(항상 최신 배포를 받게)
      // - _nuxt 정적 자산: 장기 캐시(파일명 해시로 안전)
      '/**': {
        headers: {
          'cache-control': 'no-store',
          // 클릭재킹 방지: 이 사이트를 다른 사이트가 iframe에 넣지 못하게 함
          'x-frame-options': 'DENY',
          // 브라우저가 응답의 Content-Type을 무시하고 내용을 추측(sniffing)해서 실행하는 것을 막음
          'x-content-type-options': 'nosniff',
          // 외부 사이트로 이동할 때 현재 URL(세션 토큰이 담길 수 있는 쿼리 등)을 넘기지 않음
          'referrer-policy': 'strict-origin-when-cross-origin',
          // 카메라/마이크/위치 등 이 앱이 쓰지 않는 브라우저 기능을 전부 비활성화
          'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
          // HTTPS 강제(HSTS) — Vercel은 항상 HTTPS로 서빙되므로 안전
          'strict-transport-security': 'max-age=63072000; includeSubDomains',
          // 우선 Report-Only로 적용: 차단은 안 하고 브라우저 콘솔에 위반 사항만 경고로 띄움.
          // 실제 운영에서 며칠 지켜보고 깨지는 게 없으면 'content-security-policy'로 이름만
          // 바꿔서 강제 적용하면 됨(OKX/Binance 실시간 시세 웹소켓, 구글 폰트, jsdelivr
          // (Pretendard 폰트)만 허용해둔 상태 — TradingViewWidget.vue는 현재 어디서도 쓰이지
          // 않는 죽은 코드라 tradingview.com은 일부러 안 넣음. 나중에 그 위젯을 쓰게 되면
          // script-src/connect-src/frame-src에 https://s3.tradingview.com, https://*.tradingview.com
          // 을 추가해야 함).
          'content-security-policy-report-only': [
            "default-src 'self'",
            // Nuxt가 hydration용 데이터를 인라인 <script>로 심는데, 페이지마다 내용이 달라
            // 해시/nonce 고정이 안 돼서 'unsafe-inline'이 필요함(known limitation).
            // 그래도 나머지 지시어(connect-src, frame-ancestors, object-src 등)는 그대로
            // 강하게 제한되어 있어 방어 효과는 남아있음.
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "img-src 'self' data: https:",
            "connect-src 'self' wss://ws.okx.com:8443 wss://fstream.binance.com",
            "worker-src 'self' blob:",
            "frame-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            // 실사용자 브라우저에서 위반이 생기면 여기로 보고를 받아 서버에 기록(콘솔만으론
            // 아무도 안 보니까) — server/api/csp-report.post.ts, bitduck_log_csp_reports 테이블
            'report-uri /api/csp-report'
          ].join('; ')
        }
      },
      '/_nuxt/**': {
        headers: {
          'cache-control': 'public, max-age=31536000, immutable'
        }
      }
    }
  },
  runtimeConfig: {
    // 서버 전용: Supabase service role (절대 public에 넣지 마세요)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    // 서버 전용: 앱 DB를 Supabase로 동기화(복원/미러)할지 여부
    supabaseAppDbEnabled: process.env.SUPABASE_APP_DB_ENABLED || '',
    // 서버 전용: 클라이언트 번들에 넣을 이유가 전혀 없음(클라이언트 코드가 Supabase를 직접
    // 호출하지 않고, 항상 이 서버의 API 라우트를 거침) — 예전엔 public 밑에 있어서 방문자
    // 브라우저로 그대로 전송됐었다. anon key는 이미 노출된 적이 있으니 Supabase 대시보드에서
    // 재발급(rotate)하는 것을 권장.
    supabaseUrl: process.env.SUPABASE_URL || 'https://mbywcrniwwvlkrncxfky.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    // 서버 전용: Supabase 대시보드상의 프로젝트 이름(예: "BITDUCK"). API/URL만으로는 알 수 없어서
    // 별도 환경변수로 관리 — 관리자 "DB 연결 상태" 화면에 표시하기 위한 용도.
    supabaseProjectName: process.env.SUPABASE_PROJECT_NAME || '',
    public: {
      appName: 'BITDUCK'
    }
  }
})
