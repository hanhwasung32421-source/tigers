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
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }]
    }
  },
  nitro: {
    routeRules: {
      // 배포 후에도 오래된 HTML이 캐시되어 "없는 _nuxt 청크"를 요청하는 문제를 줄입니다.
      // - HTML/페이지 응답: 캐시 금지(항상 최신 배포를 받게)
      // - _nuxt 정적 자산: 장기 캐시(파일명 해시로 안전)
      '/**': {
        headers: {
          'cache-control': 'no-store'
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
    // 서버 전용
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    // 서버 전용: Supabase service role (절대 public에 넣지 마세요)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    // 서버 전용: 앱 DB를 Supabase로 동기화(복원/미러)할지 여부
    supabaseAppDbEnabled: process.env.SUPABASE_APP_DB_ENABLED || '',
    // 서버 전용: 클라이언트 번들에 넣을 이유가 전혀 없음(클라이언트 코드가 Supabase를 직접
    // 호출하지 않고, 항상 이 서버의 API 라우트를 거침) — 예전엔 public 밑에 있어서 방문자
    // 브라우저로 그대로 전송됐었다. anon key는 이미 노출된 적이 있으니 Supabase 대시보드에서
    // 재발급(rotate)하는 것을 권장.
    supabaseUrl: process.env.SUPABASE_URL || 'https://dyfycrmltqosezmsufup.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    public: {
      appName: 'BITDUCK'
    }
  }
})
