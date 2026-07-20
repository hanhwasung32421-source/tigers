import { requireUser } from '../../utils/auth'
import { getDbUserById } from '../../utils/db'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { z } from 'zod'

const bodySchema = z.object({
  chartMode: z.enum(['tradingview', 'built'])
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)

  const dbUser = await getDbUserById(user.id)
  if (!dbUser) {
    throw createError({ statusCode: 404, statusMessage: '사용자를 찾을 수 없습니다.' })
  }

  const permissions = JSON.parse(dbUser.permissions || '{}')
  permissions.chartMode = parsed.chartMode

  const supa = getSupabaseAdminClient()
  const { error } = await supa.from('anti_users').update({
    permissions: JSON.stringify(permissions)
  }).eq('id', user.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: '차트 모드 저장에 실패했습니다.' })
  }

  return { success: true }
})
