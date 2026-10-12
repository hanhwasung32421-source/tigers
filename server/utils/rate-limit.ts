import { createError } from 'h3'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'

// IP당 요청 수를 Supabase 테이블(bitduck_rate_limits)에 세서, Vercel처럼 인스턴스가 여러 개인
// 서버리스 환경에서도(메모리 카운터와 달리) 정확히 제한한다. 증가는 bitduck_rate_limit_hit RPC로
// 원자적으로 처리한다 — SUPABASE_BITRABBIT_patch_rate_limits.sql을 먼저 실행해야 동작한다.
// Supabase 연동이 꺼져 있거나(로컬 sqlite 모드) RPC 호출 자체가 실패하면 제한 없이 통과시킨다
// (fail-open) — 이 기능의 장애로 로그인/거래 전체가 막히는 것을 막기 위한 선택.
export async function enforceRateLimit(bucket: string, max: number, windowSeconds: number) {
  if (!supabaseAppDbEnabled()) return

  try {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.rpc('bitduck_rate_limit_hit', {
      p_bucket: bucket,
      p_window_seconds: windowSeconds
    })
    if (error) {
      console.warn('[rate-limit] rpc failed, failing open:', error.message)
      return
    }
    const row = Array.isArray(data) ? data[0] : data
    const count = Number(row?.hit_count ?? 0)
    if (count > max) {
      throw createError({ statusCode: 429, statusMessage: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' })
    }
  } catch (e: any) {
    if (e?.statusCode === 429) throw e
    console.warn('[rate-limit] check failed, failing open:', e?.message || e)
  }
}
