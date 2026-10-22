import { shouldRunSweep, sweepLiquidations } from '../../utils/liquidation-sweep'

// 서버 자동 강제청산 점검. 회원이 접속해 있는 동안에는 /api/account 요청이 알아서 점검하지만,
// 아무도 접속해 있지 않을 때도 점검하려면 외부 스케줄러(예: 1분마다 이 주소를 호출)를 연결하면 된다.
// 여러 번 불려도 결과는 같고(이미 청산된 포지션은 건너뜀), 5초 안에 다시 불리면 건너뛴다.
export default defineEventHandler(async () => {
  if (!shouldRunSweep('cron', 5000)) return { ok: true, skipped: true }
  const r = await sweepLiquidations()
  return { ok: true, ...r }
})
