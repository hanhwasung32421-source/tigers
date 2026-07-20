import { requireUser } from '../utils/auth'
import { getDbBalance, getDbPositions, getDbTrades, getDbProfitCards } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const bal = await getDbBalance(user.id)
  const positions = await getDbPositions(user.id)
  const trades = await getDbTrades(user.id, 50)
  const cards = await getDbProfitCards(user.id, 50)

  return {
    me: user,
    balance: { usdt: bal },
    positions,
    trades,
    cards
  }
})
