import { DatabaseSync } from 'node:sqlite'
import { isMissingColumnError, supaCount, supaUpsert, supaUpsertStrict, supaInsert, supaUpsertUserSettings } from './supabase'

// Supabase 테이블명 (요구사항: bitrabbit_ prefix)
const T_USERS = 'bitrabbit_users'
const T_BALANCES = 'bitrabbit_balances'
const T_POSITIONS = 'bitrabbit_positions'
const T_TRADES = 'bitrabbit_trades'
const T_PROFIT_CARDS = 'bitrabbit_profit_cards'
const T_USER_SETTINGS = 'bitrabbit_user_settings'
const T_MESSAGES = 'bitrabbit_messages'

export function supabaseAppDbEnabled() {
  const cfg = useRuntimeConfig()
  return String(cfg.supabaseAppDbEnabled || '').toLowerCase() === '1' || String(cfg.supabaseAppDbEnabled || '').toLowerCase() === 'true'
}

function parsePerm(v: any) {
  if (!v) return {}
  if (typeof v === 'object') return v
  try {
    return JSON.parse(String(v))
  } catch {
    return {}
  }
}

export async function syncUserToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_USERS,
    {
      id: Number(row.id),
      username: String(row.username),
      password_hash: String(row.password_hash),
      name: String(row.name || ''),
      birth_date: String(row.birth_date || ''),
      bank_name: String(row.bank_name || ''),
      bank_account: String(row.bank_account || ''),
      account_holder: String(row.account_holder || ''),
      referral_code: String(row.referral_code || ''),
      terms_agreed_at: row.terms_agreed_at ? String(row.terms_agreed_at) : null,
      password_reset_required: Boolean(row.password_reset_required),
      password_reset_notice_dismissed_at: row.password_reset_notice_dismissed_at ? String(row.password_reset_notice_dismissed_at) : null,
      role: String(row.role),
      permissions: parsePerm(row.permissions),
      created_at: row.created_at,
      updated_at: String(row.updated_at || row.created_at || '')
    },
    'id'
  )
}

export async function syncBalanceToSupabase(userId: number, usdt: number) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(T_BALANCES, { user_id: Number(userId), usdt: Number(usdt) }, 'user_id')
}

export async function syncUserSettingsToSupabase(userId: number, percent: number, leverage: number, updatedAt: string, chartPrefs: any = {}) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsertUserSettings({
    user_id: Number(userId),
    trade_percent: Number(percent),
    trade_leverage: Number(leverage),
    chart_prefs: chartPrefs || {},
    updated_at: updatedAt
  })
}

export async function syncPositionToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_POSITIONS,
    {
      id: Number(row.id),
      user_id: Number(row.user_id),
      symbol: String(row.symbol),
      side: String(row.side),
      qty: Number(row.qty),
      entry_price: Number(row.entry_price),
      leverage: Number(row.leverage),
      margin: Number(row.margin),
      created_at: row.created_at
    },
    'id'
  )
}

export async function syncTradeToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  const payload: any = {
    id: Number(row.id),
    user_id: Number(row.user_id),
    symbol: String(row.symbol),
    side: String(row.side),
    qty: Number(row.qty),
    entry_price: Number(row.entry_price),
    exit_price: Number(row.exit_price),
    leverage: Number(row.leverage),
    pnl: Number(row.pnl),
    liquidation: Number(row.liquidation || 0),
    created_at: row.created_at
  }
  try {
    await supaUpsertStrict(T_TRADES, payload, 'id')
  } catch (e: any) {
    if (isMissingColumnError(e, 'liquidation')) {
      delete payload.liquidation
      await supaUpsertStrict(T_TRADES, payload, 'id')
      return
    }
    // 기존 동기화 실패로 전체 흐름을 막지 않음
  }
}

export async function syncProfitCardToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  // 단순 insert(중복 방지는 운영에서 unique constraint 추가 권장)
  await supaInsert(T_PROFIT_CARDS, {
    user_id: Number(row.user_id),
    trade_id: Number(row.trade_id),
    title: String(row.title),
    note: String(row.note || ''),
    created_at: row.created_at
  })
}

export async function syncMessageToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_MESSAGES,
    {
      id: Number(row.id),
      thread_key: String(row.thread_key || ''),
      sender_id: Number(row.sender_id),
      recipient_id: Number(row.recipient_id),
      subject: String(row.subject || ''),
      body: String(row.body || ''),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at || '')
    },
    'id'
  )
}

export async function bootstrapSupabaseAppDb(db: DatabaseSync) {
  if (!supabaseAppDbEnabled()) return

  // 1) Supabase가 비어있으면(SQLite -> Supabase) 초기 업로드
  const supaUsers = await supaCount(T_USERS).catch(() => 0)
  const sqliteUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c ?? 0

  if (supaUsers === 0 && sqliteUsers > 0) {
    const users = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[]
    if (users.length) await supaUpsert(T_USERS, users.map((u) => ({ ...u, permissions: parsePerm(u.permissions) })), 'id')

    const balances = db.prepare('SELECT * FROM balances').all() as any[]
    if (balances.length) await supaUpsert(T_BALANCES, balances, 'user_id')

    const settings = db.prepare('SELECT * FROM user_settings').all() as any[]
    if (settings.length) {
      for (const s of settings) {
        await supaUpsertUserSettings({
          user_id: Number(s.user_id),
          trade_percent: Number(s.trade_percent),
          trade_leverage: Number(s.trade_leverage),
          chart_prefs: (() => {
            try {
              return typeof s.chart_prefs === 'string' ? JSON.parse(s.chart_prefs || '{}') : s.chart_prefs || {}
            } catch {
              return {}
            }
          })(),
          updated_at: String(s.updated_at)
        })
      }
    }

    const positions = db.prepare('SELECT * FROM positions').all() as any[]
    if (positions.length) await supaUpsert(T_POSITIONS, positions, 'id')

    const trades = db.prepare('SELECT * FROM trades').all() as any[]
    if (trades.length) {
      try {
        await supaUpsertStrict(T_TRADES, trades, 'id')
      } catch (e: any) {
        if (isMissingColumnError(e, 'liquidation')) {
          await supaUpsertStrict(
            T_TRADES,
            trades.map((t) => {
              const { liquidation, ...rest } = t
              return rest
            }),
            'id'
          )
        }
      }
    }

    const messages = db.prepare('SELECT * FROM messages').all() as any[]
    if (messages.length) await supaUpsert(T_MESSAGES, messages, 'id')
  }

  // (예전에는 여기서 매 서버 시작(콜드스타트)마다 Supabase의 users/balances/positions/
  // trades/messages 전체를 SQLite로 통째로 재다운로드했다. 그런데 Supabase 연동 모드에서는
  // 모든 API 라우트가 이 SQLite 사본을 전혀 읽지 않고 Supabase를 직접 읽고 쓴다 — 그래서
  // 이 재다운로드는 아무 데도 안 쓰이면서 콜드스타트마다 egress/로그만 쓰고 있었다.
  // Supabase 무료 플랜 egress/로그 한도 초과의 주 원인으로 확인되어 제거함.)
}
