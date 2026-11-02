import { requireSuperAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  ;(globalThis as any).__LAST_ERROR__ = undefined
  return { ok: true }
})
