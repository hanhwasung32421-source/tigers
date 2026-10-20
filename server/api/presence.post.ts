import { readBody } from 'h3'
import { requireUser } from '../utils/auth'
import { supabaseAppDbEnabled } from '../utils/supa-appdb'
import { supaUpsert } from '../utils/supabase'

// 회원이 지금 보고 있는 화면(경로)을 기록한다. 관리자 "실시간 접속"에서 접속 경로로 보여준다.
// 테이블(bitduck_user_presence)이 아직 없어도 supaUpsert가 경고만 남기므로 사이트 동작에는 영향이 없다.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = (await readBody(event).catch(() => ({}))) as any
  const raw = String(body?.path || '').split('?')[0].split('#')[0].slice(0, 120)
  if (!raw.startsWith('/') || !/^[A-Za-z0-9/_\-.%]+$/.test(raw)) return { ok: false }
  if (!supabaseAppDbEnabled()) return { ok: true }
  await supaUpsert('bitduck_user_presence', { user_id: Number(user.id), path: raw, updated_at: new Date().toISOString() }, 'user_id')
  return { ok: true }
})
