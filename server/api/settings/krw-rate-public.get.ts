import { resolveKrwPerUsdtRate } from '../../utils/system-settings'

// 자산구매 화면의 미리보기용. 환율(원/USDT)은 비밀 정보가 아니라서 로그인 없이 조회할 수 있게 둔다.
export default defineEventHandler(async () => {
  try {
    const rate = await resolveKrwPerUsdtRate()
    return { rate: Number(rate) > 0 ? Number(rate) : 0 }
  } catch {
    return { rate: 0 }
  }
})
