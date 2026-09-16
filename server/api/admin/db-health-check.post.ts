import { join } from 'node:path'
import { requireSuperAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import versionInfo from '../../../version.json'

// 배포/DB 연결 상태를 한눈에 확인하기 위한 진단용 엔드포인트.
// 실제 서비스 데이터와 무관하게, 지금 배포된 버전을 나타내는 문자열(예: "260916-6")을
// SQLite/Supabase 양쪽에 각각 직접 써보고 곧바로 다시 읽어서 "정말 그 DB에 반영됐는지"를 확인한다.
// (supabaseAppDbEnabled 여부와 무관하게 둘 다 시도 — 어느 한쪽만 확인하면 의미가 없어서)
type CheckResult = { ok: boolean; marker?: string | null; checkedAt?: string | null; detail?: string; error?: string }

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const info = versionInfo as { date?: string; build?: number }
  const marker = `${info?.date || '?'}-${info?.build ?? '?'}`
  const now = new Date().toISOString()

  const sqlite: CheckResult = await (async () => {
    try {
      const db = getDb()
      db.prepare('UPDATE system_settings SET health_marker = ?, health_checked_at = ? WHERE id = 1').run(marker, now)
      const row = db.prepare('SELECT health_marker, health_checked_at FROM system_settings WHERE id = 1').get() as
        | { health_marker?: string; health_checked_at?: string }
        | undefined
      return {
        ok: row?.health_marker === marker,
        marker: row?.health_marker ?? null,
        checkedAt: row?.health_checked_at ?? null,
        detail: process.env.SQLITE_DIR ? join(process.env.SQLITE_DIR, 'app.db') : join(process.cwd(), 'data', 'app.db')
      }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })()

  const supabase: CheckResult = await (async () => {
    try {
      const cfg = useRuntimeConfig()
      const supa = getSupabaseAdminClient()
      const { error: upErr } = await supa.from('bitduck_system_settings').update({ health_marker: marker, health_checked_at: now }).eq('id', 1)
      if (upErr) throw upErr
      const { data, error: selErr } = await supa
        .from('bitduck_system_settings')
        .select('health_marker, health_checked_at')
        .eq('id', 1)
        .maybeSingle()
      if (selErr) throw selErr
      return {
        ok: data?.health_marker === marker,
        marker: data?.health_marker ?? null,
        checkedAt: data?.health_checked_at ?? null,
        detail: String(cfg.supabaseUrl || '')
      }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })()

  return {
    marker,
    activeMode: supabaseAppDbEnabled() ? 'supabase' : 'sqlite',
    sqlite,
    supabase
  }
})
