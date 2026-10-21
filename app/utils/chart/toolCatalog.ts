// 차트 그리기 도구 목록(트레이딩뷰 방식): 그룹(왼쪽 툴바 버튼) → 섹션(펼침 메뉴의 소제목) → 도구.
// n = 도구를 완성하는 데 필요한 점(클릭) 수. 0이면 점 개수가 정해져 있지 않다(더블클릭/Enter로 마침).
// existing = 이미 있던 기존 도구(추세선/수평선/수직선/사각형/원)를 그대로 쓰는 항목.

export type ToolDef = {
  id: string
  ko: string
  en: string
  n: number
  color: string
  icon: string
  shortcut?: string
  existing?: 'trend' | 'hline' | 'vline' | 'rect' | 'circle'
  // 'ask' = 그린 직후 글자 입력창을 띄움, 'fixed' = 고르는 기호(이모지/아이콘)를 그대로 씀
  text?: 'ask' | 'fixed'
  freehand?: boolean
  // 기본 글자(입력창 초기값)
  defaultText?: { ko: string; en: string }
}

export type ToolSection = { ko: string; en: string; tools: ToolDef[] }
export type ToolGroup = { id: string; ko: string; en: string; sections: ToolSection[] }

const dot = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="1.9" fill="currentColor" stroke="none"/>`
const ring = (x: number, y: number, r = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none"/>`
const path = (d: string) => `<path d="${d}"/>`
const dash = (d: string) => `<path d="${d}" stroke-dasharray="2 2"/>`

const BLUE = '#2962ff'
const YELLOW = '#f0b90b'
const GREEN = '#22ab94'
const RED = '#f23645'
const PURPLE = '#9c27b0'
const ORANGE = '#ff9800'
const GRAY = '#9db2bd'
const TEAL = '#00bcd4'

function T(id: string, ko: string, en: string, n: number, color: string, icon: string, extra: Partial<ToolDef> = {}): ToolDef {
  return { id, ko, en, n, color, icon, ...extra }
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    ko: '선',
    en: 'Lines',
    sections: [
      {
        ko: '라인',
        en: 'Lines',
        tools: [
          T('trend', '추세선', 'Trend Line', 2, YELLOW, path('M5 22L23 6') + dot(5, 22) + dot(23, 6), { existing: 'trend', shortcut: 'Alt+T' }),
          T('ray', '빔', 'Ray', 2, BLUE, path('M5 22L25 4') + dot(5, 22) + dot(13, 14)),
          T('infoline', '인포 라인', 'Info Line', 2, BLUE, path('M5 20L23 10') + dot(5, 20) + dot(23, 10) + path('M12 7h10v5H12z')),
          T('extline', '익스텐디드 라인', 'Extended Line', 2, BLUE, path('M3 25L25 3') + dot(10, 18) + dot(18, 10)),
          T('trendangle', '추세각', 'Trend Angle', 2, BLUE, path('M5 22L23 8') + path('M5 22H24') + path('M12 22a7 7 0 0 0-2.4-5.2') + dot(5, 22) + dot(23, 8)),
          T('hline', '가로줄', 'Horizontal Line', 1, '#2962ff', path('M3 14H25') + dot(14, 14), { existing: 'hline', shortcut: 'Alt+H' }),
          T('hray', '가로빔', 'Horizontal Ray', 1, BLUE, path('M6 14H26') + dot(6, 14)),
          T('vline', '세로줄', 'Vertical Line', 1, '#38bdf8', path('M14 3V25') + dot(14, 14), { existing: 'vline', shortcut: 'Alt+I' }),
          T('crossline', '크로스 라인', 'Cross Line', 1, BLUE, path('M3 14H25M14 3V25') + dot(14, 14))
        ]
      },
      {
        ko: '채널',
        en: 'Channels',
        tools: [
          T('pchannel', '패러렐 채널', 'Parallel Channel', 3, BLUE, path('M4 20L22 8M6 25L24 13') + dot(4, 20) + dot(22, 8) + dot(6, 25)),
          T('regression', '회귀추세', 'Regression Trend', 2, BLUE, path('M4 20L24 8') + dash('M4 14L24 2M4 26L24 14') + dot(4, 20) + dot(24, 8)),
          T('flattopbottom', '플랫 탑/바텀', 'Flat Top/Bottom', 3, BLUE, path('M4 22L18 8') + path('M4 14H20') + dot(4, 22) + dot(18, 8) + dot(4, 14)),
          T('disjoint', '디스조인트 채널', 'Disjoint Channel', 4, BLUE, path('M4 22L14 8M14 24L24 6') + dot(4, 22) + dot(14, 8) + dot(14, 24) + dot(24, 6))
        ]
      },
      {
        ko: '피치포크',
        en: 'Pitchforks',
        tools: [
          T('pitchfork', '피치포크', 'Pitchfork', 3, BLUE, path('M4 22L24 10M10 6L24 10M10 22L24 10') + dot(4, 22) + dot(10, 6) + dot(10, 22)),
          T('schiff', '쉬프 피치포크', 'Schiff Pitchfork', 3, BLUE, path('M7 16L26 10M12 5L26 10M12 24L26 10') + dot(7, 16) + dot(12, 5) + dot(12, 24)),
          T('modschiff', '수정 쉬프 피치포크', 'Modified Schiff Pitchfork', 3, BLUE, path('M9 14L26 14M14 5L26 14M14 24L26 14') + dot(9, 14) + dot(14, 5) + dot(14, 24)),
          T('insidepitch', '인사이드 피치포크', 'Inside Pitchfork', 3, BLUE, path('M4 22L25 12M10 6L25 12M10 22L25 12M8 14L25 12') + dot(4, 22) + dot(10, 6) + dot(10, 22))
        ]
      }
    ]
  },
  {
    id: 'fib',
    ko: '피보나치 · 갠',
    en: 'Fib & Gann',
    sections: [
      {
        ko: '피보나치',
        en: 'Fibonacci',
        tools: [
          T('fibret', '피보나치 되돌림', 'Fib Retracement', 2, '#787b86', path('M4 7H24M4 12H24M4 17H24M4 22H24') + dot(6, 22) + dot(22, 7)),
          T('fibext', '추세기반 피보나치 확장', 'Trend-Based Fib Extension', 3, '#787b86', path('M4 24L10 12L16 18') + path('M16 8H26M16 13H26M16 18H26') + dot(4, 24) + dot(10, 12) + dot(16, 18)),
          T('fibchannel', '피보나치 채널', 'Fib Channel', 3, '#787b86', path('M4 24L22 12M4 19L22 7M4 14L22 2') + dot(4, 24) + dot(22, 12) + dot(4, 14)),
          T('fibtimezone', '피보나치 타임존', 'Fib Time Zone', 2, '#787b86', path('M5 4V24M9 4V24M14 4V24M23 4V24') + dot(5, 24) + dot(9, 24)),
          T('fibfan', '피보나치 스피드 리지스턴스 팬', 'Fib Speed Resistance Fan', 2, '#787b86', path('M4 24L24 4M4 24L24 10M4 24L24 16M4 24L24 21') + dot(4, 24) + dot(24, 4)),
          T('fibtrendtime', '추세기반 피보나치 시간', 'Trend-Based Fib Time', 3, '#787b86', path('M4 22L9 10L14 16') + path('M17 4V24M21 4V24M26 4V24') + dot(4, 22) + dot(9, 10) + dot(14, 16)),
          T('fibcircles', '피보나치 서클', 'Fib Circles', 2, '#787b86', `<circle cx="14" cy="14" r="10" fill="none"/><circle cx="14" cy="14" r="6" fill="none"/><circle cx="14" cy="14" r="2.5" fill="none"/>`),
          T('fibspiral', '피보나치 스파이럴', 'Fib Spiral', 2, '#787b86', path('M14 14c0-2 3-2 3 0s-4 4-6 1-1-8 5-8 9 7 7 11-9 7-13 3')),
          T('fibarcs', '피보나치 스피드 리지스턴스 아크', 'Fib Speed Resistance Arcs', 2, '#787b86', path('M4 24L24 4M7 10a14 14 0 0 1 16 14M10 6a20 20 0 0 1 14 18') + dot(4, 24) + dot(24, 4)),
          T('fibwedge', '피보나치 웻지', 'Fib Wedge', 3, '#787b86', path('M5 24L24 6M5 24L24 20M9 18a8 8 0 0 1 8 6M12 14a12 12 0 0 1 10 10') + dot(5, 24)),
          T('pitchfan', '피치팬', 'Pitchfan', 3, '#787b86', path('M4 24L24 4M4 24L24 12M4 24L24 20M24 4V20') + dot(4, 24) + dot(24, 4) + dot(24, 20))
        ]
      },
      {
        ko: '갠',
        en: 'Gann',
        tools: [
          T('gannbox', '갠 박스', 'Gann Box', 2, '#787b86', path('M5 5H24V24H5z') + path('M5 11H24M5 17H24M11 5V24M17 5V24')),
          T('gannsquarefixed', '갠 스퀘어 픽스트', 'Gann Square Fixed', 2, '#787b86', path('M5 5H24V24H5z') + path('M5 5L24 24M24 5L5 24M14.5 5V24M5 14.5H24')),
          T('gannsquare', '갠 스퀘어', 'Gann Square', 2, '#787b86', path('M5 7H24V22H5z') + path('M5 7L24 22M24 7L5 22M14.5 7V22M5 14.5H24')),
          T('gannfan', '갠 팬', 'Gann Fan', 2, '#787b86', path('M4 24L24 4M4 24L24 9M4 24L24 14M4 24L24 19M4 24L19 4M4 24L14 4') + dot(4, 24))
        ]
      }
    ]
  },
  {
    id: 'patterns',
    ko: '패턴',
    en: 'Patterns',
    sections: [
      {
        ko: '차트 패턴',
        en: 'Chart Patterns',
        tools: [
          T('xabcd', 'XABCD 패턴', 'XABCD Pattern', 5, ORANGE, path('M3 20L8 6L13 16L18 8L25 22') + dash('M3 20L13 16M8 6L18 8M13 16L25 22')),
          T('cypher', '사이퍼 패턴', 'Cypher Pattern', 5, ORANGE, path('M3 20L8 8L13 17L20 5L24 15') + dash('M3 20L13 17M8 8L20 5')),
          T('headshoulders', '헤드 앤 숄더', 'Head and Shoulders', 7, ORANGE, path('M2 20L6 12L9 17L14 6L19 17L22 12L26 20') + dash('M9 17L26 17')),
          T('abcd', 'ABCD 패턴', 'ABCD Pattern', 4, ORANGE, path('M4 22L10 8L16 18L24 4') + dash('M4 22L16 18M10 8L24 4')),
          T('trianglepattern', '삼각형 패턴', 'Triangle Pattern', 4, ORANGE, path('M4 6L10 22L16 10L22 18') + dash('M4 6L22 18M10 22L22 18')),
          T('threedrives', '쓰리 드라이브', 'Three Drives Pattern', 7, ORANGE, path('M2 22L6 14L9 18L13 10L16 14L21 4L25 8'))
        ]
      },
      {
        ko: '엘리어트 파동',
        en: 'Elliott Waves',
        tools: [
          T('elliottimpulse', '엘리어트 임펄스 파동 (12345)', 'Elliott Impulse Wave (12345)', 6, BLUE, path('M3 24L8 12L11 18L18 5L21 11L26 3')),
          T('elliottcorrection', '엘리어트 코렉션 파동 (ABC)', 'Elliott Correction Wave (ABC)', 4, BLUE, path('M3 6L9 20L14 12L24 24')),
          T('elliotttriangle', '엘리어트 삼각형 파동 (ABCDE)', 'Elliott Triangle Wave (ABCDE)', 6, BLUE, path('M3 8L8 22L13 12L17 19L20 14L24 17')),
          T('elliottdouble', '엘리어트 더블 콤보 파동 (WXY)', 'Elliott Double Combo Wave (WXY)', 4, BLUE, path('M3 22L9 8L14 16L24 4')),
          T('elliotttriple', '엘리어트 트리플 콤보 파동 (WXYXZ)', 'Elliott Triple Combo Wave (WXYXZ)', 6, BLUE, path('M3 22L7 12L11 17L16 6L20 12L26 3'))
        ]
      },
      {
        ko: '사이클',
        en: 'Cycles',
        tools: [
          T('cycliclines', '사이클릭 라인', 'Cyclic Lines', 2, BLUE, path('M5 4V24M12 4V24M19 4V24M26 4V24')),
          T('timecycles', '타임 사이클', 'Time Cycles', 2, BLUE, path('M3 20a5.5 7 0 0 1 11 0M14 20a5.5 7 0 0 1 11 0')),
          T('sineline', '사인 라인', 'Sine Line', 2, BLUE, path('M3 14c4-12 7-12 11 0s7 12 11 0'))
        ]
      }
    ]
  },
  {
    id: 'forecast',
    ko: '예측 · 측정',
    en: 'Forecast & Measure',
    sections: [
      {
        ko: '예측과 프로젝션',
        en: 'Forecasting & Projection',
        tools: [
          T('longpos', '롱 포지션', 'Long Position', 3, GREEN, path('M5 5H24V13H5z M5 13H24V21H5z') + path('M5 13H24')),
          T('shortpos', '숏 포지션', 'Short Position', 3, RED, path('M5 7H24V15H5z M5 15H24V23H5z') + path('M5 15H24')),
          T('forecast', '예측', 'Forecast', 2, BLUE, dash('M4 22L20 8') + path('M20 8l-2 4M20 8l-4-1') + dot(4, 22) + path('M17 4h8v6h-8z')),
          T('barspattern', '바 패턴', 'Bars Pattern', 3, BLUE, path('M5 20V10M5 14h-2M5 17h2M11 22V8M11 12h-2M11 18h2M17 18V6M17 9h-2M17 14h2')),
          T('ghostfeed', '고스트 피드', 'Ghost Feed', 3, BLUE, dash('M5 20V10M11 22V8M17 18V6M23 16V4')),
          T('projection', '프로젝션', 'Projection', 3, BLUE, path('M4 22L10 12L10 22z') + dash('M16 22L22 12L22 22z') + dot(4, 22) + dot(10, 12))
        ]
      },
      {
        ko: '볼륨 기반',
        en: 'Volume-Based',
        tools: [
          T('avwap', '앵커드 VWAP', 'Anchored VWAP', 1, '#2962ff', path('M5 20c3-2 5 2 8-2s6-2 10-10') + dot(5, 20)),
          T('volprofile', '고정 범위 볼륨 프로파일', 'Fixed Range Volume Profile', 2, '#2962ff', path('M4 6h8M4 10h14M4 14h10M4 18h16M4 22h9') + path('M4 4V24'))
        ]
      },
      {
        ko: '측정',
        en: 'Measurer',
        tools: [
          T('pricerange', '가격 범위', 'Price Range', 2, BLUE, path('M14 4V24M14 4l-3 4M14 4l3 4M14 24l-3-4M14 24l3-4M8 4H20M8 24H20')),
          T('daterange', '날짜 범위', 'Date Range', 2, BLUE, path('M4 14H24M4 14l4-3M4 14l4 3M24 14l-4-3M24 14l-4 3M4 8V20M24 8V20')),
          T('datepricerange', '날짜 및 가격 범위', 'Date and Price Range', 2, BLUE, path('M5 6H23V22H5z') + path('M14 6V22M5 14H23'))
        ]
      }
    ]
  },
  {
    id: 'shapes',
    ko: '브러시 · 도형',
    en: 'Brush & Shapes',
    sections: [
      {
        ko: '브러시',
        en: 'Brushes',
        tools: [
          T('brush', '브러시', 'Brush', 0, BLUE, path('M4 22c3-2 4-8 8-9s4 5 8 3 3-7 5-9'), { freehand: true }),
          T('highlighter', '형광펜', 'Highlighter', 0, YELLOW, `<path d="M5 22c3-2 4-8 8-9s4 5 8 3 3-7 5-9" stroke-width="5" opacity=".5"/>`, { freehand: true })
        ]
      },
      {
        ko: '화살표',
        en: 'Arrows',
        tools: [
          T('arrowmarker', '화살표 마커', 'Arrow Marker', 2, BLUE, `<path d="M5 23L19 9" stroke-width="4"/><path d="M14 6h8v8z" fill="currentColor"/>`),
          T('arrow', '화살표', 'Arrow', 2, BLUE, path('M5 23L22 6M22 6h-7M22 6v7')),
          T('arrowup', '위 화살표', 'Arrow Mark Up', 1, GREEN, `<path d="M14 4L5 15h5v9h8v-9h5z" fill="currentColor" stroke="none"/>`),
          T('arrowdown', '아래 화살표', 'Arrow Mark Down', 1, RED, `<path d="M14 24L5 13h5V4h8v9h5z" fill="currentColor" stroke="none"/>`)
        ]
      },
      {
        ko: '도형',
        en: 'Shapes',
        tools: [
          T('rect', '사각형', 'Rectangle', 2, '#22c55e', path('M5 7H23V21H5z'), { existing: 'rect', shortcut: 'Alt+P' }),
          T('rotrect', '회전된 사각형', 'Rotated Rectangle', 3, BLUE, path('M5 15L13 5L24 13L16 23z')),
          T('path', '패스', 'Path', 0, BLUE, path('M4 22L10 10L16 18L24 6M24 6h-6M24 6v6')),
          T('circle', '원', 'Circle', 2, '#a855f7', `<circle cx="14" cy="14" r="9" fill="none"/>`, { existing: 'circle', shortcut: 'Alt+O' }),
          T('ellipse', '타원', 'Ellipse', 3, BLUE, `<ellipse cx="14" cy="14" rx="11" ry="7" fill="none"/>`),
          T('polyline', '폴리라인', 'Polyline', 0, BLUE, path('M5 21L8 7L19 4L24 15L14 23z')),
          T('triangle', '삼각형', 'Triangle', 3, BLUE, path('M14 5L24 22H4z')),
          T('arc', '호', 'Arc', 3, BLUE, path('M4 21C6 7 22 7 24 21')),
          T('curve', '곡선', 'Curve', 3, BLUE, path('M4 21Q14 -2 24 21')),
          T('doublecurve', '이중 곡선', 'Double Curve', 2, BLUE, path('M4 21C12 21 16 7 24 7'))
        ]
      }
    ]
  },
  {
    id: 'text',
    ko: '텍스트 · 메모',
    en: 'Text & Notes',
    sections: [
      {
        ko: '텍스트와 메모',
        en: 'Text & Notes',
        tools: [
          T('text', '텍스트', 'Text', 1, '#d1d4dc', path('M7 6H21M14 6V23M11 23H17'), { text: 'ask', defaultText: { ko: '텍스트', en: 'Text' } }),
          T('anchoredtext', '앵커드 텍스트', 'Anchored Text', 1, '#d1d4dc', path('M7 5H21M14 5V16') + dot(14, 22) + path('M14 16V20'), { text: 'ask', defaultText: { ko: '텍스트', en: 'Text' } }),
          T('note', '노트', 'Note', 1, YELLOW, path('M6 5H22V18H15L11 23V18H6z'), { text: 'ask', defaultText: { ko: '노트', en: 'Note' } }),
          T('pricenote', '가격 노트', 'Price Note', 2, YELLOW, path('M4 22L14 12') + path('M14 6H25V13H14z') + dot(4, 22), { text: 'ask', defaultText: { ko: '', en: '' } }),
          T('pin', '핀', 'Pin', 1, RED, `<circle cx="14" cy="9" r="5" fill="currentColor" stroke="none"/><path d="M14 14V24"/>`, { text: 'ask', defaultText: { ko: '', en: '' } }),
          T('table', '테이블', 'Table', 1, '#d1d4dc', path('M5 6H23V22H5z M5 12H23M5 17H23M12 6V22'), { text: 'ask', defaultText: { ko: '항목 1\n항목 2\n항목 3', en: 'Item 1\nItem 2\nItem 3' } }),
          T('callout', '콜아웃', 'Callout', 2, BLUE, path('M12 5H25V13H12z') + path('M12 12L4 22') + dot(4, 22), { text: 'ask', defaultText: { ko: '콜아웃', en: 'Callout' } }),
          T('comment', '코멘트', 'Comment', 1, BLUE, path('M5 5H23V17H15L11 22V17H5z'), { text: 'ask', defaultText: { ko: '코멘트', en: 'Comment' } }),
          T('pricelabel', '가격 라벨', 'Price Label', 1, BLUE, path('M4 14L9 8H25V20H9z')),
          T('signpost', '사인포스트', 'Signpost', 1, GREEN, path('M8 3V25M8 6H22L25 9.5L22 13H8'), { text: 'ask', defaultText: { ko: '사인', en: 'Sign' } }),
          T('flagnote', '플래그 노트', 'Flag Note', 1, RED, path('M8 3V25M8 5H23L19 10L23 15H8'), { text: 'ask', defaultText: { ko: '플래그', en: 'Flag' } })
        ]
      }
    ]
  }
]

// 이모지/기호 도구: 목록에서 기호를 골라 차트에 놓는다.
export const EMOJI_LIST = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤔', '😮', '😢', '😡', '🥳',
  '👍', '👎', '👏', '🙏', '💪', '🔥', '🚀', '🌙', '⭐', '💎', '💰', '💸',
  '📈', '📉', '🐂', '🐻', '🎯', '⚠️', '✅', '❌', '❤️', '💔', '🏆', '🔔'
]
export const ICON_LIST = ['✔', '✖', '★', '☆', '▲', '▼', '◆', '●', '■', '⚑', '$', '€', '¥', '₿', '↑', '↓', '→', '←', '☀', '☂', '✉', '⚡', '♛', '✪']

export const EMOJI_TOOL_ICON = `<circle cx="14" cy="14" r="10" fill="none"/>${dot(10.5, 11.5)}${dot(17.5, 11.5)}<path d="M9 17c2.5 3.5 7.5 3.5 10 0"/>`

export const ALL_TOOLS: ToolDef[] = TOOL_GROUPS.flatMap((g) => g.sections.flatMap((s) => s.tools))
export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t]))
// 새 엔진이 직접 그리는 도구 id(기존 5개 도구는 제외) + 이모지/아이콘
export const EXTRA_TOOL_IDS = new Set<string>([...ALL_TOOLS.filter((t) => !t.existing).map((t) => t.id), 'emoji'])

export function toolOf(type: string): ToolDef | null {
  if (type === 'emoji') {
    return { id: 'emoji', ko: '이모지', en: 'Emoji', n: 1, color: '#ffffff', icon: EMOJI_TOOL_ICON, text: 'fixed' }
  }
  return TOOL_BY_ID[type] || null
}

export const SIDE_ICONS = {
  cursor: `<path d="M14 3V11M14 17V25M3 14H11M17 14H25"/>${dot(14, 14)}`,
  ruler: `<path d="M4 20L20 4l4 4L8 24z"/><path d="M8 16l2.5 2.5M11 13l2.5 2.5M14 10l2.5 2.5M17 7l2.5 2.5"/>`,
  zoom: `<circle cx="12" cy="12" r="7" fill="none"/><path d="M17.5 17.5L24 24M9 12h6M12 9v6"/>`,
  magnet: `<path d="M6 5v9a8 8 0 0 0 16 0V5h-5v9a3 3 0 0 1-6 0V5z"/><path d="M6 9h5M17 9h5"/>`,
  stay: `<path d="M5 22l2-6 11-11 4 4-11 11z"/><path d="M16 7l4 4"/>`,
  lock: `<rect x="6" y="12" width="16" height="11" rx="2" fill="none"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/>`,
  unlock: `<rect x="6" y="12" width="16" height="11" rx="2" fill="none"/><path d="M9 12V9a5 5 0 0 1 9.5-2"/>`,
  eye: `<path d="M3 14s4-7 11-7 11 7 11 7-4 7-11 7S3 14 3 14z"/><circle cx="14" cy="14" r="3.5" fill="none"/>`,
  eyeOff: `<path d="M3 14s4-7 11-7 11 7 11 7-4 7-11 7S3 14 3 14z"/><circle cx="14" cy="14" r="3.5" fill="none"/><path d="M5 23L23 5"/>`,
  trash: `<path d="M6 8h16M11 8V5h6v3M8 8l1 15h10l1-15M12 12v8M16 12v8"/>`
}
