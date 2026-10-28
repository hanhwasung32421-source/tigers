import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

// 디자인차트 "적용대상" 검색: 이름 또는 아이디에 검색어가 들어간 회원을 최대 20명 돌려준다(총관리자 전용).
const QuerySchema = z.object({ q: z.string().min(1).max(40) })

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const { q } = QuerySchema.parse(getQuery(event))
  // 검색 조건 문자열에 쓰이는 특수문자는 뺀다.
  const term = q.replace(/[%_,()\*]/g, ' ').trim()
  if (!term) return { users: [] }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa
      .from('bitduck_users')
      .select('id, username, name')
      .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
      .order('id', { ascending: false })
      .limit(20)
    if (error) throw error
    return { users: (data || []).map((u: any) => ({ id: Number(u.id), username: String(u.username || ''), name: String(u.name || '') })) }
  }

  const db = getDb()
  const rows = db.prepare('SELECT id, username, name FROM users WHERE username LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 20').all(`%${term}%`, `%${term}%`) as any[]
  return { users: rows.map((u) => ({ id: Number(u.id), username: String(u.username || ''), name: String(u.name || '') })) }
})
