import { getMarketOverview } from '../../utils/market-instruments'

export default defineEventHandler(async (event) => {
  // 시세는 공개 데이터라 Vercel CDN이 10초간 그대로 돌려주고(그 뒤 30초는 낡은 값을 먼저 주고 백그라운드로 갱신) 첫 화면이 빨라진다.
  setHeader(event, 'Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
  try {
    return await getMarketOverview()
  } catch (e: any) {
    console.error('[markets/overview] failed:', e)
    throw createError({ statusCode: 502, statusMessage: '마켓 정보를 불러오지 못했습니다.' })
  }
})
