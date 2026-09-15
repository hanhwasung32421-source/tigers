import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { updateSystemSettingsExtra } from '../../../utils/system-settings'

// 필드별 상세 검증(색상 형식, 숫자 범위, 허용된 폰트인지)은 서버의
// normalizeProfitCardStyle()이 실제 저장 전에 다시 한번 책임지고 수행한다(신뢰 경계).
// 여기서는 형태만 걸러준다: 문자열 또는 숫자 값을 가진 평범한 객체.
const ProfitCardStyleSchema = z.record(z.string(), z.union([z.string(), z.number()]))

const BodySchema = z.object({
  telegramUrl: z.string().trim().max(300).optional(),
  krwPerUsdt: z.number().nonnegative().optional(),
  lossSettlementPercent: z.number().min(0).max(100).optional(),
  referralSettlementPercent: z.number().min(0).max(100).optional(),
  menuOrder: z.array(z.string()).optional(),
  mainNavOrder: z.array(z.string()).optional(),
  mainNavHidden: z.array(z.string()).optional(),
  profitCardStyle: ProfitCardStyleSchema.optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const next = await updateSystemSettingsExtra(body)
  return { ok: true, ...next }
})
