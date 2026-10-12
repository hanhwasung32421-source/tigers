import { getRequestHeader, getRequestIP } from 'h3'
import type { H3Event } from 'h3'
import { supaInsert } from './supabase'

export async function logAppUser(user: { id: number; username: string; role: string }) {
  await supaInsert('bitrabbit_log_users', {
    local_user_id: user.id,
    username: user.username,
    role: user.role,
    created_at: new Date().toISOString()
  })
}

export async function logLogin(
  event: H3Event,
  payload: { userId?: number | null; username?: string | null; area: 'main' | 'admin'; success: boolean }
) {
  const ua = getRequestHeader(event, 'user-agent')
  const ip = getRequestIP(event)
  await supaInsert('bitrabbit_log_logins', {
    local_user_id: payload.userId ?? null,
    username: payload.username ?? null,
    area: payload.area,
    success: payload.success,
    ip,
    user_agent: ua ?? null,
    created_at: new Date().toISOString()
  })
}

export async function logBuy(payload: {
  userId: number
  symbol: string
  side: string
  buy_price: number
  qty: number
  margin: number
  leverage: number
}) {
  await supaInsert('bitrabbit_log_buys', {
    local_user_id: payload.userId,
    symbol: payload.symbol,
    side: payload.side,
    buy_time: new Date().toISOString(),
    buy_price: payload.buy_price,
    qty: payload.qty,
    margin: payload.margin,
    leverage: payload.leverage,
    total_usdt: payload.buy_price * payload.qty
  })
}

export async function logAdminCredit(payload: { adminUserId: number; userId: number; amount: number }) {
  await supaInsert('bitrabbit_log_credits', {
    admin_local_user_id: payload.adminUserId,
    target_local_user_id: payload.userId,
    amount: payload.amount,
    created_at: new Date().toISOString()
  })
}

export async function logAdminAction(
  event: H3Event,
  payload: { adminUserId: number; action: string; targetType?: string; targetId?: string | number | null; detail?: Record<string, any> }
) {
  const ua = getRequestHeader(event, 'user-agent')
  const ip = getRequestIP(event)
  await supaInsert('bitrabbit_log_admin_actions', {
    admin_local_user_id: payload.adminUserId,
    action: payload.action,
    target_type: payload.targetType ?? null,
    target_id: payload.targetId != null ? String(payload.targetId) : null,
    detail: payload.detail ?? null,
    ip,
    user_agent: ua ?? null,
    created_at: new Date().toISOString()
  })
}

export async function logImpersonate(
  event: H3Event,
  payload: { adminUserId: number; targetUserId: number; targetUsername: string }
) {
  const ua = getRequestHeader(event, 'user-agent')
  const ip = getRequestIP(event)
  await supaInsert('bitrabbit_log_impersonations', {
    admin_local_user_id: payload.adminUserId,
    target_local_user_id: payload.targetUserId,
    target_username: payload.targetUsername,
    ip,
    user_agent: ua ?? null,
    created_at: new Date().toISOString()
  })
}

