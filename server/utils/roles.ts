import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaInsertStrict } from './supabase'
import { defaultMenuPermissions, normalizeMenuPermissions, type MenuPermissions } from './menu-permissions'

const T_ADMIN_ROLES = 'trae_admin_roles'

// 시스템에 고정된 역할(계정 생성/수정 UI에서 항상 존재) — 역할 관리에서 추가/삭제 대상이 아니다.
export const RESERVED_ROLE_IDS = new Set(['user', 'super_admin'])
const DEFAULT_ROLE_ID = 'branch_admin'
const DEFAULT_ROLE_LABEL = '부어드민'

export type RoleDefinition = {
  id: string
  label: string
  menus: MenuPermissions
  createdAt: string
}

function rowToRole(row: any): RoleDefinition {
  let menus: any = row.menus
  if (typeof menus === 'string') {
    try {
      menus = JSON.parse(menus)
    } catch {
      menus = {}
    }
  }
  return {
    id: String(row.id),
    label: String(row.label || row.id),
    menus: normalizeMenuPermissions(menus),
    createdAt: String(row.created_at || '')
  }
}

async function fetchAllRoles(): Promise<RoleDefinition[]> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from(T_ADMIN_ROLES).select('*').order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(rowToRole)
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM admin_roles ORDER BY created_at ASC').all() as any[]
  return rows.map(rowToRole)
}

// 기존에 이미 branch_admin 역할로 활동 중인 계정들이 계속 정상 동작하도록,
// 역할 테이블이 비어있으면(최초 실행) 기본 역할을 하나 만들어 둔다.
async function seedDefaultIfEmpty(roles: RoleDefinition[]): Promise<RoleDefinition[]> {
  if (roles.length > 0) return roles
  const now = new Date().toISOString()
  const menus = defaultMenuPermissions()
  try {
    if (supabaseAppDbEnabled()) {
      await supaInsertStrict(T_ADMIN_ROLES, { id: DEFAULT_ROLE_ID, label: DEFAULT_ROLE_LABEL, menus, created_at: now })
    } else {
      const db = getDb()
      db.prepare('INSERT OR IGNORE INTO admin_roles (id, label, menus, created_at) VALUES (?, ?, ?, ?)').run(
        DEFAULT_ROLE_ID,
        DEFAULT_ROLE_LABEL,
        JSON.stringify(menus),
        now
      )
    }
  } catch {
    // 동시 요청 등으로 이미 생성됐을 수 있음 - 무시
  }
  return fetchAllRoles()
}

let cache: { at: number; roles: RoleDefinition[] } | null = null
const CACHE_MS = 5000

function invalidateCache() {
  cache = null
}

export async function listRoles(forceRefresh = false): Promise<RoleDefinition[]> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_MS) return cache.roles
  let roles = await fetchAllRoles()
  roles = await seedDefaultIfEmpty(roles)
  cache = { at: Date.now(), roles }
  return roles
}

export async function getRoleDefinition(id: string, forceRefresh = false): Promise<RoleDefinition | null> {
  const roles = await listRoles(forceRefresh)
  return roles.find((r) => r.id === id) || null
}

async function countUsersWithRole(id: string): Promise<number> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { count, error } = await supa.from('trae_users').select('*', { count: 'exact', head: true }).eq('role', id)
    if (error) throw error
    return count ?? 0
  }
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get(id) as { c: number } | undefined
  return Number(row?.c || 0)
}

export async function createRole(id: string, label: string): Promise<RoleDefinition> {
  const cleanId = id.trim().toLowerCase()
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(cleanId)) {
    throw createError({ statusCode: 400, statusMessage: '역할 ID는 영문 소문자로 시작하는 영문 소문자/숫자/밑줄 2~31자여야 합니다.' })
  }
  if (RESERVED_ROLE_IDS.has(cleanId)) {
    throw createError({ statusCode: 409, statusMessage: '이미 시스템에서 사용 중인 이름입니다.' })
  }
  const existing = await getRoleDefinition(cleanId, true)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '이미 존재하는 역할입니다.' })
  }
  const now = new Date().toISOString()
  const menus = defaultMenuPermissions()
  const cleanLabel = label.trim() || cleanId
  if (supabaseAppDbEnabled()) {
    await supaInsertStrict(T_ADMIN_ROLES, { id: cleanId, label: cleanLabel, menus, created_at: now })
  } else {
    const db = getDb()
    db.prepare('INSERT INTO admin_roles (id, label, menus, created_at) VALUES (?, ?, ?, ?)').run(cleanId, cleanLabel, JSON.stringify(menus), now)
  }
  invalidateCache()
  return { id: cleanId, label: cleanLabel, menus, createdAt: now }
}

export async function updateRole(id: string, patch: { label?: string; menus?: any }): Promise<RoleDefinition> {
  const current = await getRoleDefinition(id, true)
  if (!current) throw createError({ statusCode: 404, statusMessage: '역할을 찾을 수 없습니다.' })
  const next: RoleDefinition = {
    ...current,
    label: typeof patch.label === 'string' ? patch.label.trim() || current.label : current.label,
    menus: patch.menus ? normalizeMenuPermissions(patch.menus) : current.menus
  }
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_ADMIN_ROLES).update({ label: next.label, menus: next.menus }).eq('id', id)
    if (error) throw error
  } else {
    const db = getDb()
    db.prepare('UPDATE admin_roles SET label = ?, menus = ? WHERE id = ?').run(next.label, JSON.stringify(next.menus), id)
  }
  invalidateCache()
  return next
}

export async function deleteRole(id: string): Promise<void> {
  if (RESERVED_ROLE_IDS.has(id)) {
    throw createError({ statusCode: 400, statusMessage: '기본 역할은 삭제할 수 없습니다.' })
  }
  const count = await countUsersWithRole(id)
  if (count > 0) {
    throw createError({ statusCode: 409, statusMessage: `이 역할을 사용 중인 계정이 ${count}명 있어 삭제할 수 없습니다. 먼저 해당 계정들의 역할을 바꿔주세요.` })
  }
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_ADMIN_ROLES).delete().eq('id', id)
    if (error) throw error
  } else {
    const db = getDb()
    db.prepare('DELETE FROM admin_roles WHERE id = ?').run(id)
  }
  invalidateCache()
}
