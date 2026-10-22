import { readSystemSettingsRowLight } from '../../utils/system-settings'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'

// 첫 화면 배경 영상 위에 덮는 "흰 필터" 농도(0~100%). 모든 방문자가 같은 값을 보도록 Supabase(bitduck_system_settings.hero_wash_percent)에 저장한다.
export const DEFAULT_HERO_WASH = 55

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (!supabaseAppDbEnabled()) return { percent: DEFAULT_HERO_WASH }
  try {
    const row = await readSystemSettingsRowLight()
    const n = Number(row?.hero_wash_percent)
    return { percent: Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : DEFAULT_HERO_WASH }
  } catch {
    // 컬럼이 아직 없거나 조회에 실패해도 기본값으로 첫 화면이 정상 표시되게 한다.
    return { percent: DEFAULT_HERO_WASH }
  }
})
