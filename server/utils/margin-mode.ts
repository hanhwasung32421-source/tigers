import { getDb } from './db'
import { supabaseAppDbEnabled, syncUserSettingsToSupabase } from './supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaUpsertUserSettings } from './supabase'

// 격리/교차 마진 모드를 서버에도 저장해 두는 이유: 서버가 대신 강제청산하려면(회원이 화면을 닫고 있어도)
// 그 회원이 격리인지 교차인지 알아야 하기 때문이다. 별도 DB 컬럼을 만들지 않고, 이미 있는 user_settings.chart_prefs(JSON)에
// 종목 키들과 겹치지 않는 예약 키(__marginMode)로 함께 넣는다. (chart.post.ts / trade.post.ts는 이 JSON의 다른 키를 그대로 보존한다.)
export type MarginMode = 'isolated' | 'cross'
const KEY = '__marginMode'

function modeFromPrefs(raw: any): MarginMode | null {
  let prefs = raw
  if (typeof prefs === 'string') {
    try {
      prefs = JSON.parse(prefs)
    } catch {
      return null
    }
  }
  const v = prefs && typeof prefs === 'object' ? prefs[KEY] : null
  return v === 'cross' || v === 'isolated' ? v : null
}

// 저장된 값이 없는(=서버가 모르는) 회원은 null. 서버 자동 청산은 모드를 아는 회원만 대상으로 한다.
export async function getUserMarginModes(userIds: number[]): Promise<Map<number, MarginMode | null>> {
  const out = new Map<number, MarginMode | null>()
  const ids = Array.from(new Set(userIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)))
  if (!ids.length) return out
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    // chart_prefs 전체(그림 등 큰 데이터)를 읽지 않고 마진 모드 값 하나만 JSON 경로로 읽는다(DB 읽기량 절약).
    // chart_prefs가 JSON 타입이 아니어서 이 문법이 안 되는 경우에만 예전처럼 전체를 읽는다.
    for (const id of ids) out.set(id, null)
    const light = await supa.from('bitduck_user_settings').select('user_id, m:chart_prefs->>__marginMode').in('user_id', ids)
    if (!light.error) {
      for (const r of (light.data || []) as any[]) {
        const m = r.m
        out.set(Number(r.user_id), m === 'cross' || m === 'isolated' ? m : null)
      }
      return out
    }
    const { data, error } = await supa.from('bitduck_user_settings').select('user_id, chart_prefs').in('user_id', ids)
    if (error) throw error
    for (const r of data || []) out.set(Number((r as any).user_id), modeFromPrefs((r as any).chart_prefs))
    return out
  }
  const db = getDb()
  const marks = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT user_id, chart_prefs FROM user_settings WHERE user_id IN (${marks})`).all(...ids) as any[]
  for (const id of ids) out.set(id, null)
  for (const r of rows) out.set(Number(r.user_id), modeFromPrefs(r.chart_prefs))
  return out
}

export async function getUserMarginMode(userId: number): Promise<MarginMode | null> {
  return (await getUserMarginModes([userId])).get(Number(userId)) ?? null
}

export async function countUserPositions(userId: number): Promise<number> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { count, error } = await supa.from('bitduck_positions').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    if (error) throw error
    return Number(count || 0)
  }
  const row = getDb().prepare('SELECT COUNT(*) AS c FROM positions WHERE user_id = ?').get(userId) as any
  return Number(row?.c || 0)
}

export async function setUserMarginMode(userId: number, mode: MarginMode): Promise<void> {
  const now = new Date().toISOString()
  if (supabaseAppDbEnabled()) {
    const prev = await supaSelectOne<any>('bitduck_user_settings', { user_id: userId })
    let prefs: any = prev?.chart_prefs
    if (typeof prefs === 'string') {
      try {
        prefs = JSON.parse(prefs)
      } catch {
        prefs = {}
      }
    }
    prefs = prefs && typeof prefs === 'object' && !Array.isArray(prefs) ? { ...prefs } : {}
    prefs[KEY] = mode
    await supaUpsertUserSettings({
      user_id: userId,
      trade_percent: Number(prev?.trade_percent ?? 50),
      trade_leverage: Number(prev?.trade_leverage ?? 100),
      chart_prefs: prefs,
      updated_at: now
    })
    return
  }
  const db = getDb()
  const prev = db.prepare('SELECT trade_percent, trade_leverage, chart_prefs FROM user_settings WHERE user_id = ?').get(userId) as any
  let prefs: any = {}
  try {
    prefs = prev?.chart_prefs ? JSON.parse(String(prev.chart_prefs)) : {}
  } catch {
    prefs = {}
  }
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) prefs = {}
  prefs[KEY] = mode
  db.prepare(
    `INSERT INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET chart_prefs = excluded.chart_prefs, updated_at = excluded.updated_at`
  ).run(userId, Number(prev?.trade_percent ?? 50), Number(prev?.trade_leverage ?? 100), JSON.stringify(prefs), now)
  try {
    await syncUserSettingsToSupabase(userId, Number(prev?.trade_percent ?? 50), Number(prev?.trade_leverage ?? 100), now, prefs)
  } catch {
    // 로컬 개발용 동기화 실패는 무시
  }
}

// 모드 변경 규칙: 보유 포지션이 있는 동안에는(서버에 이미 저장된 모드와 다른 값으로) 바꿀 수 없다.
// 저장된 값이 아직 없으면(=배포 이전부터 쓰던 회원) 한 번은 현재 화면의 모드를 그대로 기록하게 해준다.
export async function applyUserMarginMode(userId: number, mode: MarginMode): Promise<{ ok: boolean; mode: MarginMode | null }> {
  const stored = await getUserMarginMode(userId)
  if (stored === mode) return { ok: true, mode }
  if (stored !== null && (await countUserPositions(userId)) > 0) return { ok: false, mode: stored }
  await setUserMarginMode(userId, mode)
  return { ok: true, mode }
}
