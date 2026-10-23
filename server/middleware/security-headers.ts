import { setResponseHeaders } from 'h3'

// 페이지(HTML) 응답에만 붙이는 보안 헤더. 예전에는 nuxt.config.ts routeRules '/**'에 있어서 모든 API 응답(차트가 1초마다 부르는 요청 포함)에도
// 매번 약 1KB가 붙었고, 이게 Vercel 데이터 전송량(Fast Origin Transfer 등)을 불필요하게 늘렸다. API/정적 파일 경로에는 붙이지 않는다.
const SECURITY_HEADERS: Record<string, string> = {
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

export default defineEventHandler((event) => {
  const path = event.path || ''
  if (path.startsWith('/api/') || path.startsWith('/_nuxt/') || path.startsWith('/__nuxt')) return
  setResponseHeaders(event, SECURITY_HEADERS)
})
