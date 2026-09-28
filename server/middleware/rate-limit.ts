import { getRequestIP } from 'h3'
import { enforceRateLimit } from '../utils/rate-limit'

// 브루트포스(로그인)·스팸 가입·스팸 주문을 막기 위한 IP 기준 경로별 제한.
// 필요해지면 여기 표만 조정하면 된다.
const RULES: { method: string; path: string; max: number; windowSeconds: number }[] = [
  { method: 'POST', path: '/api/auth/login', max: 10, windowSeconds: 300 },
  { method: 'POST', path: '/api/admin/login', max: 10, windowSeconds: 600 },
  { method: 'POST', path: '/api/auth/register', max: 5, windowSeconds: 600 },
  { method: 'POST', path: '/api/auth/forgot-password', max: 5, windowSeconds: 600 },
  { method: 'POST', path: '/api/trade/open', max: 60, windowSeconds: 60 },
  { method: 'POST', path: '/api/trade/close', max: 60, windowSeconds: 60 },
  { method: 'POST', path: '/api/wallet/withdraw-request', max: 20, windowSeconds: 600 },
  { method: 'POST', path: '/api/wallet/deposit-request', max: 20, windowSeconds: 600 },
  { method: 'POST', path: '/api/csp-report', max: 60, windowSeconds: 60 }
]

export default defineEventHandler(async (event) => {
  const method = event.method
  const path = (event.path || '').split('?')[0]
  const rule = RULES.find((r) => r.method === method && r.path === path)
  if (!rule) return

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  await enforceRateLimit(`${rule.path}:${ip}`, rule.max, rule.windowSeconds)
})
