export const conversationBackup = {
  project: {
    name: 'exchange-demo',
    repoRemote: 'https://github.com/hanhwasung32421-source/usdetrade',
    framework: 'Nuxt 4',
    language: 'TypeScript',
    styling: 'Tailwind CSS',
    chartLibrary: 'lightweight-charts 5.2.0',
    databaseModes: ['SQLite', 'Supabase'],
    deployment: ['GitHub 연결', '배포 완료 사이트 운영 중']
  },
  logs: [
    {
      timestamp: '2026-07-20T00:00:00+09:00',
      type: 'conversation',
      userMessage: '폴더는 현재 깃허브에 올렸고 홈페이지 디플로이 되어있는 내가 만든 거래소 사이트야. 여기서 세부적이 내용들을 너한테 요청해서 수정하고 너가 깃허브에 푸쉬를 앞으로 할거야. 우선 폴더 안 내용을 파악해줘. 5번정도 여러가지 방법으로 파악해서 완벽하게 이해해줘.',
      assistantWorkSummary: [
        '전체 폴더 트리와 핵심 디렉터리 구조를 확인함',
        'package.json, nuxt.config.ts, README.md, version.json을 읽어 실행 방식과 의존성, 환경변수 구조를 파악함',
        'app/pages, server/api, server/utils를 읽어 프론트/백엔드 흐름을 확인함',
        '거래 수수료 4% 로직과 사용자 설정 저장 구조를 코드 검색으로 교차 검증함',
        '참고용 코드 폴더와 실제 운영 코드 폴더를 분리해 확인함',
        'Git 원격 저장소, 브랜치, 최근 커밋 상태를 확인함'
      ],
      repoUnderstanding: {
        activeFrontend: {
          baseDir: 'app',
          mainPages: [
            '/',
            '/exchange/DOGEUSDT',
            '/wallet',
            '/invest/balance',
            '/invest/orders',
            '/invest/trades',
            '/profit',
            '/support',
            '/admin',
            '/auth/login',
            '/auth/register'
          ],
          importantFiles: [
            'app/pages/exchange/[symbol].vue',
            'app/layouts/default.vue',
            'app/layouts/trading.vue',
            'app/composables/useMe.ts'
          ]
        },
        activeBackend: {
          baseDir: 'server',
          apiGroups: [
            'auth',
            'admin',
            'trade',
            'settings',
            'profit',
            'okx',
            'trades'
          ],
          importantFiles: [
            'server/api/trade/open.post.ts',
            'server/api/trade/close.post.ts',
            'server/api/account.get.ts',
            'server/api/settings/trade.post.ts',
            'server/api/settings/chart.post.ts',
            'server/utils/auth.ts',
            'server/utils/db.ts',
            'server/utils/supabase.ts'
          ]
        },
        businessRules: [
          '매수 시 4% 수수료를 잔고에서 추가 차감함',
          '잔고가 부족하면 수수료를 포함할 수 있도록 사용 증거금을 자동 축소함',
          '매도 시 손익 계산 후 4% 수수료를 차감해 잔고에 반영함',
          '차트 설정과 거래 설정은 user_settings 또는 trae_user_settings에 저장함',
          'Supabase 활성화 시 Supabase를 단일 진실 소스로 사용함'
        ],
        observations: [
          'app 디렉터리가 실제 Nuxt 앱의 중심으로 보임',
          '루트의 layouts, middleware, composables는 app 내부와 중복되는 레거시/이행 흔적으로 보임',
          '참고/anti 폴더는 이전 버전 또는 참고용 복사본으로 보이며 실제 운영 수정 대상은 아님',
          '참고/lightweight-charts-5.2.0은 라이브러리 참고 소스이며 앱 런타임 주 코드와 분리됨',
          'README에 적힌 원격 저장소 정보와 현재 git remote 결과가 다름'
        ],
        gitInfo: {
          branch: 'main',
          latestKnownCommit: 'd77b972 reset & deploy'
        }
      }
    },
    {
      timestamp: '2026-07-20T09:48:49+09:00',
      type: 'conversation',
      userMessage: '`https://github.com/hanhwasung32421-source/usdetrade`푸쉬는 여기로 해주면 돼. 수정할때 버전을 너가 "t" + 현재 날자 + 시간으로 텍스트로 적어줘. 디플로이될때 디플로이 되는 시간으로 적용되는게 아닌 너가 쓴 텍스트가 그대로 적용되게. 한번 푸쉬 해줘 지금',
      assistantWorkSummary: [
        'Git 저장소 루트가 c:\\trae 상위로 잡혀 있는 것을 확인함',
        '실제 사이트 파일만 선택 커밋해야 하는 상태임을 확인함',
        'version.json의 version 문자열을 우선 사용하도록 nuxt.config.ts를 수정함',
        '레이아웃에서 버전 앞의 고정 v 접두어를 제거함',
        '현재 버전을 t20260720-094849 로 직접 기록함',
        '푸시 대상 원격 저장소를 usdetrade 기준으로 정리함'
      ],
      versioningRule: {
        sourceOfTruth: 'version.json',
        format: 'tYYYYMMDD-HHMMSS',
        fixedTextRequired: true
      }
    }
  ]
}

export function getLatestConversationBackup() {
  return conversationBackup.logs[conversationBackup.logs.length - 1] || null
}
