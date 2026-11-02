import { getProfitCardStyleWithVersion, profitCardBgVersion } from '../../utils/system-settings'

// 수익카드 배경 그림을 이미지 파일로 내려준다. 주소의 v(그림 버전)가 현재 그림과 같으면 1년 캐시(브라우저/CDN),
// 다르면(옛 주소) 캐시하지 않고 현재 그림을 돌려준다.
export default defineEventHandler(async (event) => {
  const { style } = await getProfitCardStyleWithVersion()
  const bg = String(style.bgImage || '')
  const m = bg.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) throw createError({ statusCode: 404, statusMessage: 'No image' })
  const same = String(getQuery(event).v || '') === profitCardBgVersion(bg)
  setHeader(event, 'Content-Type', m[1])
  setHeader(event, 'Cache-Control', same ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'no-store')
  return Buffer.from(m[2], 'base64')
})
