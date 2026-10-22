import { getLiquidationRoe, getProfitCardStyleWithVersion } from '../../utils/system-settings'

// 화면이 5초마다 부르는 설정 조회. 강제청산 비율만 가볍게 돌려주고, 수익카드 스타일(배경 그림 포함, 수백 KB)은
// 화면이 가진 버전(v)과 다를 때만 같이 보낸다. lite=1이면 강제청산 비율만 돌려준다.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const liquidationRoe = await getLiquidationRoe()
  if (String(q.lite || '') === '1') return { liquidationRoe }
  const { style, version } = await getProfitCardStyleWithVersion()
  const sameVersion = String(q.v || '') === version
  return { liquidationRoe, styleVersion: version, ...(sameVersion ? {} : { profitCardStyle: style }) }
})
