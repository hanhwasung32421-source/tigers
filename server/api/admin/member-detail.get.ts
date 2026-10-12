import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { canViewMenu } from '../../utils/menu-permissions'

const QuerySchema = z.object({
  username: z.string().min(1)
})

// 회원목록 외의 화면(실시간접속/포지션목록/거래내역/입출금내역/정산내역/쪽지관리)에서
// "회원정보" 팝업을 띄우기 위한 조회 전용 엔드포인트. 프로필 필드 + 보유잔고 + 보유포지션을 한 번에 내려준다.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'members')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  const query = QuerySchema.parse(getQuery(event))
  const username = query.username

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: u, error: e1 } = await supa
      .from('bitrabbit_users')
      .select('id, username, name, birth_date, bank_name, bank_account, account_holder, referral_code, role, created_at')
      .eq('username', username)
      .maybeSingle()
    if (e1) throw e1
    if (!u) throw createError({ statusCode: 404, statusMessage: '회원을 찾을 수 없습니다.' })

    const { data: balRow } = await supa.from('bitrabbit_balances').select('usdt').eq('user_id', u.id).maybeSingle()
    const { data: positions, error: e2 } = await supa
      .from('bitrabbit_positions')
      .select('id, symbol, side, qty, entry_price, leverage, margin')
      .eq('user_id', u.id)
    if (e2) throw e2

    return {
      id: Number(u.id),
      username: String(u.username),
      name: String(u.name || ''),
      birthDate: String(u.birth_date || ''),
      bankName: String(u.bank_name || ''),
      bankAccount: String(u.bank_account || ''),
      accountHolder: String(u.account_holder || ''),
      referralCode: String(u.referral_code || ''),
      role: String(u.role || 'user'),
      createdAt: String(u.created_at || ''),
      balanceUsdt: Number(balRow?.usdt ?? 0),
      positions: (positions || []).map((p: any) => ({
        id: Number(p.id),
        symbol: String(p.symbol),
        side: String(p.side),
        qty: Number(p.qty),
        entryPrice: Number(p.entry_price),
        leverage: Number(p.leverage),
        margin: Number(p.margin)
      }))
    }
  }

  const db = getDb()
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
  if (!u) throw createError({ statusCode: 404, statusMessage: '회원을 찾을 수 없습니다.' })
  const balRow = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(u.id) as any
  const positions = db.prepare('SELECT * FROM positions WHERE user_id = ?').all(u.id) as any[]

  return {
    id: Number(u.id),
    username: String(u.username),
    name: String(u.name || ''),
    birthDate: String(u.birth_date || ''),
    bankName: String(u.bank_name || ''),
    bankAccount: String(u.bank_account || ''),
    accountHolder: String(u.account_holder || ''),
    referralCode: String(u.referral_code || ''),
    role: String(u.role || 'user'),
    createdAt: String(u.created_at || ''),
    balanceUsdt: Number(balRow?.usdt ?? 0),
    positions: positions.map((p) => ({
      id: Number(p.id),
      symbol: String(p.symbol),
      side: String(p.side),
      qty: Number(p.qty),
      entryPrice: Number(p.entry_price),
      leverage: Number(p.leverage),
      margin: Number(p.margin)
    }))
  }
})
