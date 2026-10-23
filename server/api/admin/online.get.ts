import { requireAdmin } from '../../utils/auth'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { getDb } from '../../utils/db'
import { canViewMenu } from '../../utils/menu-permissions'
import { listRoles } from '../../utils/roles'
import { ttlCached } from '../../utils/ttl-cache'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'online')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  const roleLabelMap = new Map((await listRoles()).map((r) => [r.id, r.label]))
  function roleText(role: string) {
    if (role === 'super_admin') return '관리자'
    if (role === 'user') return '회원'
    return roleLabelMap.get(role) || role
  }

  if (supabaseAppDbEnabled()) {
    // 자동 갱신(p=1) 요청은 2초 캐시를 공유한다(같은 화면을 여러 탭/관리자가 열어도 DB는 한 번만 읽음).
    if (String(getQuery(event).p || '') === '1') {
      return await ttlCached(`admin:online:${roleLabelMap.size}`, 2000, () => loadOnlineSupabase(roleText))
    }
    return await loadOnlineSupabase(roleText)
  }

  // SQLite 모드에서는 세션 테이블 기반 온라인 구분이 구현되어 있지 않아 빈 목록 반환
  const db = getDb()
  db.prepare('SELECT 1').get()
  return { items: [] }
})

async function loadOnlineSupabase(roleText: (role: string) => string) {
  {
    const supa = getSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const { data: sessions, error: e1 } = await supa
      .from('bitduck_sessions')
      .select('user_id, expires_at')
      .gt('expires_at', nowIso)
    if (e1) throw e1

    const ids = Array.from(new Set((sessions || []).map((s: any) => Number(s.user_id)).filter(Boolean)))
    if (!ids.length) return { items: [] }

    const { data: users, error: e2 } = await supa.from('bitduck_users').select('id, username, name, role, created_at').in('id', ids)
    if (e2) throw e2

    const { data: events, error: e3 } = await supa
      .from('bitduck_log_logins')
      .select('local_user_id, ip, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(200)
    if (e3) throw e3

    const ipMap = new Map<number, { ip: string; at: string }>()
    for (const ev of events || []) {
      const uid = Number((ev as any).local_user_id)
      const ip = (ev as any).ip ? String((ev as any).ip) : ''
      const at = String((ev as any).created_at || '')
      if (!uid || ipMap.has(uid)) continue
      ipMap.set(uid, { ip, at })
    }

    const { data: positions, error: e4 } = await supa.from('bitduck_positions').select('user_id, symbol').in('user_id', ids)
    if (e4) throw e4
    const posMap = new Map<number, string[]>()
    for (const p of positions || []) {
      const uid = Number((p as any).user_id)
      const sym = String((p as any).symbol || '')
      if (!uid || !sym) continue
      if (!posMap.has(uid)) posMap.set(uid, [])
      posMap.get(uid)!.push(sym)
    }

    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))
    const rows = ids.map((id) => {
      const u = userMap.get(Number(id))
      const ip = ipMap.get(Number(id))
      const role = String(u?.role || 'user')
      return {
        id: Number(id),
        username: String(u?.username || `user${id}`),
        name: String(u?.name || ''),
        role: roleText(role),
        roleId: role,
        ip: ip?.ip ?? null,
        lastSeenAt: ip?.at ?? null,
        online: true,
        positionSymbols: posMap.get(Number(id)) || []
      }
    })

    return { items: rows }
  }
}

