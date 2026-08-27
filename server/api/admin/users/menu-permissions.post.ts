import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { ADMIN_MENU_KEYS, normalizeMenuPermissions } from '../../../utils/menu-permissions'

const MenuSchema = z.object({
  view: z.boolean().optional(),
  edit: z.boolean().optional()
})

const BodySchema = z.object({
  userId: z.number().int().positive(),
  menus: z.record(z.enum(ADMIN_MENU_KEYS), MenuSchema)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const menus = normalizeMenuPermissions(body.menus)

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: row, error: e1 } = await supa.from('trae_users').select('permissions').eq('id', body.userId).single()
    if (e1) throw e1
    const prevPermissions = row?.permissions || {}
    const permissions = { ...prevPermissions, menus }
    const { error } = await supa.from('trae_users').update({ permissions, updated_at: new Date().toISOString() }).eq('id', body.userId)
    if (error) throw error
    return { ok: true, menus }
  }

  const db = getDb()
  const row = db.prepare('SELECT permissions FROM users WHERE id = ?').get(body.userId) as { permissions?: string } | undefined
  let prevPermissions: any = {}
  try {
    prevPermissions = JSON.parse(row?.permissions || '{}')
  } catch {
    prevPermissions = {}
  }
  const permissions = { ...prevPermissions, menus }
  db.prepare('UPDATE users SET permissions = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(permissions),
    new Date().toISOString(),
    body.userId
  )
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
  await syncUserToSupabase(userRow)

  return { ok: true, menus }
})
