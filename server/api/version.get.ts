// 중요: fs.readFileSync로 project root의 version.json을 읽으면 Vercel 같은 서버리스
// 배포에서는 그 파일이 함수 번들에 포함되지 않아 항상 ENOENT로 실패하고 build가 1로
// 고정되어 보인다. JSON을 직접 import하면 빌드 시점에 값이 번들에 인라인되어
// 어떤 배포 환경에서도 정확히 표시된다.
import versionInfo from '../../version.json'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 중요: Vercel 서버는 UTC로 동작하므로 new Date().getDate() 등을 그냥 쓰면
// KST 00시~09시 사이에는 계속 "어제" 날짜가 표시된다(예: KST 9/16 08시 = UTC 9/15 23시).
// 항상 한국(Asia/Seoul) 기준 날짜로 계산한다.
function kstParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function todayStamp(d: Date) {
  const { year, month, day } = kstParts(d)
  const yy = String(year).slice(-2)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function formatKoreanDate(d: Date) {
  const { year, month, day } = kstParts(d)
  // 요일은 시간대에 영향받지 않는 순수 달력 계산이므로 UTC 기준으로 만들어도 무방
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

export default defineEventHandler(() => {
  const now = new Date()
  const today = todayStamp(now)

  // 마지막으로 푸시된 날짜가 오늘이면 그 빌드 번호를 쓰고,
  // 아니면(푸시 없이 날짜만 지난 경우) 항상 1로 표시한다.
  const info = versionInfo as { date?: string; build?: number }
  const build = info?.date === today && Number.isFinite(Number(info?.build)) ? Number(info.build) : 1

  return { date: formatKoreanDate(now), build }
})
