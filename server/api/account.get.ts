import { requireUser } from '../utils/auth'
import { shouldRunSweep, sweepLiquidations } from '../utils/liquidation-sweep'
import { getDb } from '../utils/db'
import { supabaseAppDbEnabled } from '../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectIn, supaSelectOne, supaSelectWhere, supaUpsertUserSettings } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const useSupa = supabaseAppDbEnabled()

  // light=1: 화면이 주기적으로 갱신할 때 쓰는 가벼운 응답(잔고/포지션/거래 설정만). 거래 내역·수익카드·차트 설정(그림 등 큰 데이터)은 빼서 DB에서 읽는 양을 줄인다.
  const light = String(getQuery(event).light || '') === '1'

  // 서버 자동 강제청산: 접속해 있는 누군가의 요청이 있을 때 5초 간격으로 전체 회원 포지션을 점검한다(응답과 별개로 처리).
  // (회원마다 따로 점검하면 같은 조회가 회원 수만큼 반복되므로, 전체 점검 한 번으로 모두 처리한다.)
  try {
    if (shouldRunSweep('all', 5000)) {
      const p = sweepLiquidations().catch(() => {})
      ;(event as any).waitUntil?.(p)
    }
  } catch {
    // 점검 실패가 계정 조회를 막으면 안 된다
  }

  if (useSupa && light) {
    try {
      const balL = await supaSelectOne<{ usdt: number }>('bitduck_balances', { user_id: user.id })
      const st = await getSupabaseAdminClient().from('bitduck_user_settings').select('trade_percent, trade_leverage').eq('user_id', user.id).maybeSingle()
      if (st.error) throw st.error
      const positionsL = await supaSelectWhere<any>({ table: 'bitduck_positions', where: { user_id: user.id }, orderBy: 'id', ascending: false })
      return {
        me: user,
        balance: { usdt: balL?.usdt ?? 0 },
        settings: { tradePercent: (st.data as any)?.trade_percent ?? 100, tradeLeverage: (st.data as any)?.trade_leverage ?? 100 },
        positions: positionsL,
        trades: [],
        cards: []
      }
    } catch {
      // 가벼운 조회가 실패하면 아래의 전체 조회로 처리한다(안전망)
    }
  }

  if (useSupa) {
    const bal = await supaSelectOne<{ usdt: number }>('bitduck_balances', { user_id: user.id })

    // 사용자 거래 설정(비중/레버리지/차트 설정) - 없을 때만 기본값으로 생성.
    // 매 요청마다 upsert하면 이미 저장된 chart_prefs(BOL 등)가 기본값 {}로 덮어써져
    // 새로고침/재로그인 때마다 초기화되는 문제가 있었음(SQLite 쪽의 INSERT OR IGNORE와 동작이 달랐음).
    let settings = await supaSelectOne<any>('bitduck_user_settings', { user_id: user.id })
    if (!settings) {
      await supaUpsertUserSettings({
        user_id: user.id,
        trade_percent: 100,
        trade_leverage: 100,
        chart_prefs: {},
        updated_at: new Date().toISOString()
      })
      settings = await supaSelectOne<any>('bitduck_user_settings', { user_id: user.id })
    }

    const positions = await supaSelectWhere<any>({
      table: 'bitduck_positions',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false
    })
    const trades = await supaSelectWhere<any>({
      table: 'bitduck_trades',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false,
      limit: 50
    })
    const cardsRaw = await supaSelectWhere<any>({
      table: 'bitduck_profit_cards',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false,
      limit: 50
    })
    const tradeIds = cardsRaw.map((c: any) => c.trade_id).filter(Boolean)
    const tradesForCards = await supaSelectIn<any>({
      table: 'bitduck_trades',
      column: 'id',
      values: tradeIds
    })
    const tradeMap = new Map(tradesForCards.map((t: any) => [t.id, t]))
    const cards = cardsRaw.map((pc: any) => {
      const t = tradeMap.get(pc.trade_id) || {}
      return {
        id: pc.id,
        title: pc.title,
        note: pc.note,
        created_at: pc.created_at,
        symbol: t.symbol,
        side: t.side,
        qty: t.qty,
        pnl: t.pnl,
        entry_price: t.entry_price,
        exit_price: t.exit_price
      }
    })

    return {
      me: user,
      balance: { usdt: bal?.usdt ?? 0 },
      settings: {
        tradePercent: settings?.trade_percent ?? 100,
        tradeLeverage: settings?.trade_leverage ?? 100,
        chartPrefs: settings?.chart_prefs || {}
      },
      positions,
      trades,
      cards
    }
  }

  const db = getDb()

  const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as { usdt: number } | undefined

  // 사용자 거래 설정(비중/레버리지) - 없으면 기본값으로 생성
  db.prepare('INSERT OR IGNORE INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    50,
    100,
    '{}',
    new Date().toISOString()
  )
  const settings = db
    .prepare('SELECT trade_percent, trade_leverage, chart_prefs FROM user_settings WHERE user_id = ?')
    .get(user.id) as { trade_percent: number; trade_leverage: number; chart_prefs?: string } | undefined

  const positions = db
    .prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY id DESC')
    .all(user.id) as any[]
  const trades = db
    .prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(user.id) as any[]
  const cards = db
    .prepare(
      `SELECT pc.id, pc.title, pc.note, pc.created_at, t.symbol, t.side, t.qty, t.pnl, t.entry_price, t.exit_price
       FROM profit_cards pc
       JOIN trades t ON t.id = pc.trade_id
       WHERE pc.user_id = ?
       ORDER BY pc.id DESC
       LIMIT 50`
    )
    .all(user.id) as any[]

  return {
    me: user,
    balance: { usdt: bal?.usdt ?? 0 },
    settings: {
      tradePercent: settings?.trade_percent ?? 100,
      tradeLeverage: settings?.trade_leverage ?? 100,
      chartPrefs: (() => {
        try {
          return settings?.chart_prefs ? JSON.parse(String(settings.chart_prefs)) : {}
        } catch {
          return {}
        }
      })()
    },
    positions,
    trades,
    cards
  }
})
