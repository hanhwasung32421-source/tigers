import { getLiquidationRoe, getSystemSettingsExtra } from '../../utils/system-settings'

export default defineEventHandler(async () => {
  const liquidationRoe = await getLiquidationRoe()
  const { profitCardStyle } = await getSystemSettingsExtra()
  return { liquidationRoe, profitCardStyle }
})
