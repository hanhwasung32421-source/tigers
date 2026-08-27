import { requireSuperAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { supaSelectWhere } from '../../utils/supabase'
import { menuPermissionsOf } from '../../utils/menu-permissions'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: 'trae_users', where: { role: 'branch_admin' }, orderBy: 'id', ascending: false })
    return {
      items: rows.map((u: any) => ({
        id: Number(u.id),
        username: String(u.username || ''),
        menus: menuPermissionsOf({ role: 'branch_admin', permissions: u.permissions || {} })
      }))
    }
  }

  const db = getDb()
  const rows = db.prepare(`SELECT id, username, permissions FROM users WHERE role = 'branch_admin' ORDER BY id DESC`).all() as any[]
  return {
    items: rows.map((u) => {
      let permissions: any = {}
      try {
        permissions = JSON.parse(u.permissions || '{}')
      } catch {
        permissions = {}
      }
      return {
        id: Number(u.id),
        username: String(u.username || ''),
        menus: menuPermissionsOf({ role: 'branch_admin', permissions })
      }
    })
  }
})
