import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { getOkxLastPrice, getSymbolTickSize } from '../../utils/okx'
import { designTickSize } from '../../../shared/utils/profit-path'

// 디자인차트 설계 화면이 쓸 종목의 최소 가격 단위(틱). 설계 중 드래그 값이 이 단위에 맞춰지고, 기본 간격(±5틱)도 이 단위로 정해진다.
const QuerySchema = z.object({ symbol: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const q = QuerySchema.parse(getQuery(event))
  let fallback = 0.01
  try {
    const { last } = await getOkxLastPrice(q.symbol)
    fallback = designTickSize(Number(last))
  } catch {
    // 현재가를 못 받아도 기본값으로 진행
  }
  const tick = await getSymbolTickSize(q.symbol, fallback)
  return { tick }
})
