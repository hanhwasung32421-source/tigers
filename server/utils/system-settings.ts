import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { supaSelectOne, supaUpsertStrict } from './supabase'

const T_SYSTEM_SETTINGS = 'trae_system_settings'
export const DEFAULT_LIQUIDATION_ROE = -40

// 강제청산 기준 ROE(%). 관리자 대시보드에서 조정하며, 모든 유저의 실시간 청산 판정에 사용됩니다.
export async function getLiquidationRoe(): Promise<number> {
  if (supabaseAppDbEnabled()) {
    try {
      const row = await supaSelectOne<any>(T_SYSTEM_SETTINGS, { id: 1 })
      if (row && Number.isFinite(Number(row.liquidation_roe))) return Number(row.liquidation_roe)
    } catch {
      // 테이블이 아직 없을 수 있음(SQL 패치 미적용) → 기본값 사용
    }
    return DEFAULT_LIQUIDATION_ROE
  }

  const db = getDb()
  const row = db.prepare('SELECT liquidation_roe FROM system_settings WHERE id = 1').get() as
    | { liquidation_roe?: number }
    | undefined
  return Number.isFinite(Number(row?.liquidation_roe)) ? Number(row!.liquidation_roe) : DEFAULT_LIQUIDATION_ROE
}

export async function setLiquidationRoe(value: number): Promise<number> {
  // 음수 퍼센트만 허용(예: -40). 안전 범위로 clamp.
  const v = Math.max(-99, Math.min(-1, Math.round(Number(value))))
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    await supaUpsertStrict(T_SYSTEM_SETTINGS, { id: 1, liquidation_roe: v, updated_at: now }, 'id')
    return v
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO system_settings (id, liquidation_roe, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET liquidation_roe = excluded.liquidation_roe, updated_at = excluded.updated_at`
  ).run(v, now)
  return v
}
