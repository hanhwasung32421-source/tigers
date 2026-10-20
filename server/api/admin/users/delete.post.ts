import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  userId: z.number().int().positive()
})

// 유저 삭제(총관리자 전용). 계정 + 그 유저의 잔고/포지션/설정/세션 등 "계정 상태"를 지운다.
// 거래 내역·입출금 내역·쪽지 같은 기록은 이력 보존을 위해 그대로 둔다. 총관리자 계정과 자기 자신은 삭제할 수 없다.
const SUPA_USER_TABLES = ['bitduck_positions', 'bitduck_balances', 'bitduck_user_settings', 'bitduck_sessions', 'bitduck_user_presence', 'bitduck_password_reset_requests']
const SQLITE_USER_TABLES = ['positions', 'balances', 'user_settings', 'sessions', 'password_reset_requests']

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  if (Number(admin.id) === body.userId) {
    throw createError({ statusCode: 400, statusMessage: '본인 계정은 삭제할 수 없습니다.' })
  }

  let username = ''
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: row, error: e1 } = await supa.from('bitduck_users').select('username, role').eq('id', body.userId).maybeSingle()
    if (e1) throw e1
    if (!row) throw createError({ statusCode: 404, statusMessage: '유저를 찾을 수 없습니다.' })
    if (row.role === 'super_admin') throw createError({ statusCode: 400, statusMessage: '최고관리자 계정은 삭제할 수 없습니다.' })
    username = String(row.username || '')
    for (const table of SUPA_USER_TABLES) {
      // 아직 만들어지지 않은 테이블이 있어도 삭제 자체는 계속 진행한다.
      await supa.from(table).delete().eq('user_id', body.userId)
    }
    const { error } = await supa.from('bitduck_users').delete().eq('id', body.userId)
    if (error) throw error
  } else {
    const db = getDb()
    const row = db.prepare('SELECT username, role FROM users WHERE id = ?').get(body.userId) as { username?: string; role?: string } | undefined
    if (!row) throw createError({ statusCode: 404, statusMessage: '유저를 찾을 수 없습니다.' })
    if (row.role === 'super_admin') throw createError({ statusCode: 400, statusMessage: '최고관리자 계정은 삭제할 수 없습니다.' })
    username = String(row.username || '')
    for (const table of SQLITE_USER_TABLES) {
      try {
        db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(body.userId)
      } catch {
        // 없는 테이블은 건너뜀
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(body.userId)
  }

  await logAdminAction(event, { adminUserId: admin.id, action: 'user_delete', targetType: 'user', targetId: body.userId, detail: { username } })
  return { ok: true }
})
