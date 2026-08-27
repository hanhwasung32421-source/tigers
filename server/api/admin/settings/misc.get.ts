import { requireSuperAdmin } from '../../../utils/auth'
import { getSystemSettingsExtra } from '../../../utils/system-settings'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return await getSystemSettingsExtra()
})
