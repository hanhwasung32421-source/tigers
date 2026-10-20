import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { supaUpsertStrict, isMissingColumnError } from '../../utils/supabase'

const BodySchema = z.object({ percent: z.coerce.number().int().min(0).max(100) })

// 첫 화면 배경 영상 흰 필터 농도 저장(총관리자 전용).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  if (!supabaseAppDbEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'Supabase에 연결된 환경에서만 저장할 수 있습니다.' })
  }
  try {
    await supaUpsertStrict('bitduck_system_settings', { id: 1, hero_wash_percent: body.percent, updated_at: new Date().toISOString() }, 'id')
  } catch (e: any) {
    if (isMissingColumnError(e, 'hero_wash_percent')) {
      throw createError({
        statusCode: 409,
        statusMessage: "Supabase에 hero_wash_percent 컬럼이 없습니다. SQL Editor에서 'alter table public.bitduck_system_settings add column if not exists hero_wash_percent integer not null default 55;'를 먼저 실행해주세요."
      })
    }
    throw createError({ statusCode: 500, statusMessage: 'Supabase 저장 실패: ' + String(e?.message || e) })
  }
  return { ok: true, percent: body.percent }
})
