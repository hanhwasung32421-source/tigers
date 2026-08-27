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

export type SystemSettingsExtra = {
  telegramUrl: string
  krwPerUsdt: number
  lossSettlementPercent: number
  referralSettlementPercent: number
}

const DEFAULT_EXTRA: SystemSettingsExtra = {
  telegramUrl: '',
  krwPerUsdt: 0,
  lossSettlementPercent: 0,
  referralSettlementPercent: 0
}

function rowToExtra(row: any): SystemSettingsExtra {
  if (!row) return { ...DEFAULT_EXTRA }
  return {
    telegramUrl: String(row.telegram_url || ''),
    krwPerUsdt: Number(row.krw_per_usdt || 0),
    lossSettlementPercent: Number(row.loss_settlement_percent || 0),
    referralSettlementPercent: Number(row.referral_settlement_percent || 0)
  }
}

// 텔레그램 링크/원-USDT 환율/정산 비율 등, 관리자가 조정하는 그 외 전역 설정
export async function getSystemSettingsExtra(): Promise<SystemSettingsExtra> {
  if (supabaseAppDbEnabled()) {
    try {
      const row = await supaSelectOne<any>(T_SYSTEM_SETTINGS, { id: 1 })
      return rowToExtra(row)
    } catch {
      return { ...DEFAULT_EXTRA }
    }
  }
  const db = getDb()
  const row = db.prepare('SELECT telegram_url, krw_per_usdt, loss_settlement_percent, referral_settlement_percent FROM system_settings WHERE id = 1').get()
  return rowToExtra(row)
}

export async function updateSystemSettingsExtra(patch: Partial<SystemSettingsExtra>): Promise<SystemSettingsExtra> {
  const current = await getSystemSettingsExtra()
  const next: SystemSettingsExtra = { ...current, ...patch }
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    await supaUpsertStrict(
      T_SYSTEM_SETTINGS,
      {
        id: 1,
        telegram_url: next.telegramUrl,
        krw_per_usdt: next.krwPerUsdt,
        loss_settlement_percent: next.lossSettlementPercent,
        referral_settlement_percent: next.referralSettlementPercent,
        updated_at: now
      },
      'id'
    )
    return next
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO system_settings (id, telegram_url, krw_per_usdt, loss_settlement_percent, referral_settlement_percent, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       telegram_url = excluded.telegram_url,
       krw_per_usdt = excluded.krw_per_usdt,
       loss_settlement_percent = excluded.loss_settlement_percent,
       referral_settlement_percent = excluded.referral_settlement_percent,
       updated_at = excluded.updated_at`
  ).run(next.telegramUrl, next.krwPerUsdt, next.lossSettlementPercent, next.referralSettlementPercent, now)
  return next
}

// 관리자가 원/USDT 비율을 0(또는 미설정)으로 두면, 빗썸 공개 시세로 실시간 환율을 가져온다.
export async function resolveKrwPerUsdtRate(): Promise<number> {
  const extra = await getSystemSettingsExtra()
  if (extra.krwPerUsdt > 0) return extra.krwPerUsdt
  try {
    const res = await $fetch<any>('https://api.bithumb.com/public/ticker/USDT_KRW')
    const price = Number(res?.data?.closing_price)
    if (Number.isFinite(price) && price > 0) return price
  } catch {
    // ignore
  }
  return 0
}
