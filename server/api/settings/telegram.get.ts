import { requireUser } from '../../utils/auth'
import { getSystemSettingsExtra } from '../../utils/system-settings'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const extra = await getSystemSettingsExtra()
  return { telegramUrl: extra.telegramUrl }
})
