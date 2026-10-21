import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserSettingsToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpsertUserSettings } from '../../utils/supabase'

const DrawingPointSchema = z.object({
  time: z.any(),
  price: z.coerce.number()
})

const BolPrefsSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean().optional().default(false),
    length: z.coerce.number().positive().optional().default(20),
    stdDev: z.coerce.number().positive().optional().default(2),
    showBasis: z.boolean().optional().default(false),
    showUpper: z.boolean().optional().default(true),
    showLower: z.boolean().optional().default(true),
    basisColor: z.string().optional().default('#f59e0b'),
    upperColor: z.string().optional().default('#2563eb'),
    lowerColor: z.string().optional().default('#38bdf8')
  })
])

const ChartPrefsSchema = z.object({
  // 어느 종목의 지표/선인지(종목별로 따로 저장하기 위함. 없으면 예전 방식대로 전체 공용 취급).
  symbol: z.string().min(1).optional(),
  indicators: z.object({
    bol: BolPrefsSchema.optional().default(false),
    extra: z.array(z.string()).max(30).optional().default([])
  }).default({}),
  drawings: z.array(
    z.object({
      id: z.string(),
      // 기존 5개 도구 + 새 그리기 도구(피보나치/패턴/도형/텍스트 등) 종류 이름
      type: z.string().min(1).max(40),
      color: z.string().optional(),
      width: z.coerce.number().min(1).max(8).optional(),
      price: z.coerce.number().optional(),
      time: z.any().optional(),
      points: z.array(DrawingPointSchema).optional(),
      // 새 도구의 추가 설정(글자 등)
      opts: z.any().optional()
    })
  ).max(300).default([])
})

// chart_prefs는 종목별 맵으로 저장한다: { [SYMBOL]: { indicators, drawings } }.
// symbol이 없는 예전 요청(혹은 예전 플랫 형식으로 저장된 기존 값)은 종목을 구분할 수 없으므로
// 새로 시작한다(무리하게 예전 값을 특정 종목에 끼워맞추지 않음).
function mergeChartPrefsMap(prevRaw: any, symbol: string | undefined, slice: { indicators: any; drawings: any[] }) {
  const prevMap =
    prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw) && !('indicators' in prevRaw) && !('drawings' in prevRaw)
      ? prevRaw
      : {}
  if (!symbol) return slice
  return { ...prevMap, [symbol.toUpperCase()]: slice }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = ChartPrefsSchema.parse(await readBody(event))
  const slice = { indicators: body.indicators, drawings: body.drawings }
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const prev = await supaSelectOne<any>('bitduck_user_settings', { user_id: user.id })
    const now = new Date().toISOString()
    const chartPrefs = mergeChartPrefsMap(prev?.chart_prefs, body.symbol, slice)
    await supaUpsertUserSettings({
      user_id: user.id,
      trade_percent: Number(prev?.trade_percent ?? 50),
      trade_leverage: Number(prev?.trade_leverage ?? 100),
      chart_prefs: chartPrefs,
      updated_at: now
    })
    return { ok: true }
  }

  const db = getDb()
  const prev = db.prepare('SELECT trade_percent, trade_leverage, chart_prefs FROM user_settings WHERE user_id = ?').get(user.id) as any
  const now = new Date().toISOString()
  let prevChartPrefs: any = {}
  try {
    prevChartPrefs = prev?.chart_prefs ? JSON.parse(String(prev.chart_prefs)) : {}
  } catch {
    prevChartPrefs = {}
  }
  const chartPrefs = mergeChartPrefsMap(prevChartPrefs, body.symbol, slice)
  const chartPrefsText = JSON.stringify(chartPrefs)

  db.prepare(
    `INSERT INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       trade_percent = excluded.trade_percent,
       trade_leverage = excluded.trade_leverage,
       chart_prefs = excluded.chart_prefs,
       updated_at = excluded.updated_at`
  ).run(user.id, Number(prev?.trade_percent ?? 50), Number(prev?.trade_leverage ?? 100), chartPrefsText, now)

  await syncUserSettingsToSupabase(
    user.id,
    Number(prev?.trade_percent ?? 50),
    Number(prev?.trade_leverage ?? 100),
    now,
    chartPrefs
  )

  return { ok: true }
})
