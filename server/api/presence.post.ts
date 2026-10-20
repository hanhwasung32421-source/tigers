import { readBody } from 'h3'
import { requireUser } from '../utils/auth'
import { supabaseAppDbEnabled } from '../utils/supa-appdb'
import { getSupabaseAdminClient } from '../utils/supabase'
import { listCategorizedMarketInstruments } from '../utils/market-instruments'

// 회원이 지금 보고 있는 화면(경로)을 기록한다. 관리자 "실시간 접속"에서 "접속 중인 회원"과 접속 경로로 쓴다.
// - 이 신호가 일정 시간(관리자 쪽 기준 60초) 끊기면 접속 중 목록에서 사라진다(브라우저를 닫거나 탭을 숨긴 경우).
// - { leave: true }를 보내면(페이지를 닫을 때) 기록을 바로 지운다.
// - 차트 화면(/exchange/종목)은 어느 메뉴(코인선물/파생상품/KR주식)의 종목인지 `?m=coin|stock|kr`로 덧붙여 저장한다.

type MarketKind = 'coin' | 'stock' | 'kr'
let kindCache: { at: number; map: Map<string, MarketKind> } | null = null

async function marketKindOf(symbol: string): Promise<MarketKind | ''> {
  try {
    if (!kindCache || Date.now() - kindCache.at > 10 * 60 * 1000) {
      const loaded = await Promise.race([
        listCategorizedMarketInstruments(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
      ])
      if (loaded) {
        const map = new Map<string, MarketKind>()
        for (const i of loaded.coin) map.set(i.symbol, 'coin')
        for (const i of loaded.globalStock) map.set(i.symbol, 'stock')
        for (const i of loaded.krStock) map.set(i.symbol, 'kr')
        kindCache = { at: Date.now(), map }
      }
    }
    return kindCache?.map.get(symbol) || ''
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = (await readBody(event).catch(() => ({}))) as any
  if (!supabaseAppDbEnabled()) return { ok: true }
  const supa = getSupabaseAdminClient()

  if (body?.leave) {
    const { error } = await supa.from('bitduck_user_presence').delete().eq('user_id', Number(user.id))
    return { ok: !error }
  }

  let path = String(body?.path || '').split('?')[0].split('#')[0].slice(0, 120)
  if (!path.startsWith('/') || !/^[A-Za-z0-9/_\-.%]+$/.test(path)) return { ok: false }
  const ex = path.match(/^\/exchange\/([A-Za-z0-9]+)$/)
  if (ex) {
    const kind = await marketKindOf(String(ex[1]).toUpperCase())
    if (kind) path += `?m=${kind}`
  }

  const { error } = await supa
    .from('bitduck_user_presence')
    .upsert({ user_id: Number(user.id), path, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) console.warn('[presence]', error.message)
  return { ok: !error, ...(error ? { error: error.message } : {}) }
})
