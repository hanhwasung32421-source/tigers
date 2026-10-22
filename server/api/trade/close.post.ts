import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { executeClose } from '../../utils/trade-close'

const BodySchema = z.object({
  positionId: z.number().int().positive(),
  // 요구사항: 버튼을 누른 순간의 가격으로 서버에도 동일하게 반영
  exitPrice: z.number().positive().optional(),
  // 자동 강제청산(시스템) 여부: 거래내역에서 "청산/강제청산" 구분용
  liquidation: z.boolean().optional(),
  // 지정가 청산 등으로 포지션의 일부만 청산할 때의 수량(없거나 포지션 수량 이상이면 전량 청산)
  qty: z.number().positive().optional(),
  // 교차(cross) 마진 모드: 손실이 증거금뿐 아니라 사용가능 잔고까지 쓸 수 있다(증거금+잔고를 넘으면 전액 손실)
  cross: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  return await executeClose(user.id, body)
})
