import { seedAdmin } from '../utils/db'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[nitro] seeding admin database on supabase...')
  await seedAdmin()
})
