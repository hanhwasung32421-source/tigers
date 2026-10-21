import { getDb } from './db'
import { SessionUser } from './auth'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'
import { createError } from 'h3'
import { canEditMenu } from './menu-permissions'
import { sendTelegramText } from './telegram-notify'

export type MessageRow = {
  id: number
  thread_key: string
  sender_id: number
  recipient_id: number
  subject: string
  body: string
  read_at: string | null
  created_at: string
}

export function threadKeyForUser(userId: number) {
  return `user:${Number(userId)}`
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

export async function getOperatorAdminUser() {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: adminByName } = await supa
      .from('bitduck_users')
      .select('id, username, role')
      .eq('username', 'admin')
      .limit(1)
    const found = (adminByName || [])[0]
    if (found) return { id: Number((found as any).id), username: String((found as any).username || 'admin') }

    const { data: superAdmins } = await supa
      .from('bitduck_users')
      .select('id, username, role')
      .eq('role', 'super_admin')
      .order('id', { ascending: true })
      .limit(1)
    const fallback = (superAdmins || [])[0]
    if (fallback) return { id: Number((fallback as any).id), username: String((fallback as any).username || 'admin') }
    return null
  }

  const db = getDb()
  const row = db
    .prepare(`SELECT id, username FROM users WHERE username = ? OR role = 'super_admin' ORDER BY CASE WHEN username = 'admin' THEN 0 ELSE 1 END, id ASC LIMIT 1`)
    .get('admin') as any
  if (!row) return null
  return { id: Number(row.id), username: String(row.username || 'admin') }
}

export async function listMessageRecipientsForAdmin() {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa
      .from('bitduck_users')
      .select('id, username, name, role, created_at')
      .eq('role', 'user')
      .order('id', { ascending: false })
    if (error) throw error
    const ids = (data || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return []

    const nowIsoStr = nowIso()
    const { data: balances } = await supa.from('bitduck_balances').select('user_id, usdt').in('user_id', ids)
    const balMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

    const { data: sessions } = await supa.from('bitduck_sessions').select('user_id, expires_at').in('user_id', ids).gt('expires_at', nowIsoStr)
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    const { data: events } = await supa
      .from('bitduck_log_logins')
      .select('local_user_id, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(500)
    const lastLoginMap = new Map<number, string>()
    for (const ev of events || []) {
      const uid = Number((ev as any).local_user_id)
      if (!uid || lastLoginMap.has(uid)) continue
      lastLoginMap.set(uid, String((ev as any).created_at || ''))
    }

    return (data || []).map((u: any) => {
      const id = Number(u.id)
      return {
        id,
        username: String(u.username || ''),
        name: String(u.name || ''),
        role: String(u.role || 'user'),
        created_at: String(u.created_at || ''),
        usdt: balMap.get(id) ?? 0,
        online: onlineSet.has(id),
        lastLoginAt: lastLoginMap.get(id) ?? null
      }
    })
  }

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.role, u.created_at, b.usdt
       FROM users u
       LEFT JOIN balances b ON b.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY u.id DESC`
    )
    .all() as any[]
  return rows.map((u) => ({
    id: Number(u.id),
    username: String(u.username || ''),
    name: String(u.name || ''),
    role: String(u.role || 'user'),
    created_at: String(u.created_at || ''),
    usdt: Number(u.usdt ?? 0),
    // SQLite 모드는 세션 기반 온라인/최근 로그인 추적이 없어 기본값으로 채운다
    online: false,
    lastLoginAt: null as string | null
  }))
}

export async function listUsersByIds(ids: number[]) {
  const uniq = Array.from(new Set(ids.map((v) => Number(v)).filter(Boolean)))
  if (!uniq.length) return new Map<number, { id: number; username: string; role: string }>()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from('bitduck_users').select('id, username, role').in('id', uniq)
    if (error) throw error
    return new Map(
      (data || []).map((u: any) => [Number(u.id), { id: Number(u.id), username: String(u.username || ''), role: String(u.role || 'user') }])
    )
  }

  const db = getDb()
  const placeholders = uniq.map(() => '?').join(', ')
  const rows = db.prepare(`SELECT id, username, role FROM users WHERE id IN (${placeholders})`).all(...uniq) as any[]
  return new Map(rows.map((u) => [Number(u.id), { id: Number(u.id), username: String(u.username || ''), role: String(u.role || 'user') }]))
}

export async function insertMessages(rows: Array<Omit<MessageRow, 'id' | 'created_at'>>) {
  const payload = rows.map((r) => ({
    id: makeId(),
    thread_key: String(r.thread_key),
    sender_id: Number(r.sender_id),
    recipient_id: Number(r.recipient_id),
    subject: String(r.subject || ''),
    body: String(r.body || ''),
    read_at: r.read_at ? String(r.read_at) : null,
    created_at: nowIso()
  }))

  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { error } = await supa.from('bitduck_messages').insert(payload as any)
      if (!error) return payload
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO messages (id, thread_key, sender_id, recipient_id, subject, body, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const row of payload) {
    stmt.run(row.id, row.thread_key, row.sender_id, row.recipient_id, row.subject, row.body, row.read_at, row.created_at)
  }
  return payload
}

export async function getThreadMessages(threadKey: string) {
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { data, error } = await supa.from('bitduck_messages').select('*').eq('thread_key', threadKey).order('created_at', { ascending: true })
      if (!error) {
        return ((data || []) as any[]).map((m) => ({
          id: Number(m.id),
          thread_key: String(m.thread_key),
          sender_id: Number(m.sender_id),
          recipient_id: Number(m.recipient_id),
          subject: String(m.subject || ''),
          body: String(m.body || ''),
          read_at: m.read_at ? String(m.read_at) : null,
          created_at: String(m.created_at || '')
        })) as MessageRow[]
      }
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const rows = db.prepare(`SELECT * FROM messages WHERE thread_key = ? ORDER BY created_at ASC`).all(threadKey) as any[]
  return rows.map((m) => ({
    id: Number(m.id),
    thread_key: String(m.thread_key),
    sender_id: Number(m.sender_id),
    recipient_id: Number(m.recipient_id),
    subject: String(m.subject || ''),
    body: String(m.body || ''),
    read_at: m.read_at ? String(m.read_at) : null,
    created_at: String(m.created_at || '')
  })) as MessageRow[]
}

// 회원 문의/입출금 알림은 항상 "운영자 계정(admin)" 앞으로 저장된다. "쪽지관리 > 쪽지 답장 권한"을 가진
// 관리자 계정(총관리자 포함)은 그 운영자 앞으로 온 쪽지도 자기 쪽지처럼 안 읽음 수/종/알림음/읽음 처리에 포함한다.
// (운영자 ID 조회가 폴링(5초)마다 DB를 치지 않도록 1분간 캐시)
let operatorIdCache: { id: number; at: number } | null = null
async function cachedOperatorId(): Promise<number | null> {
  if (operatorIdCache && Date.now() - operatorIdCache.at < 60_000) return operatorIdCache.id
  const operator = await getOperatorAdminUser()
  if (!operator) return null
  operatorIdCache = { id: Number(operator.id), at: Date.now() }
  return operatorIdCache.id
}

export async function inboxRecipientIdsFor(user: SessionUser): Promise<number[]> {
  const ids = new Set<number>([Number(user.id)])
  if (user.role !== 'user' && canEditMenu(user, 'messages')) {
    const operatorId = await cachedOperatorId()
    if (operatorId) ids.add(operatorId)
  }
  return Array.from(ids)
}

export async function getThreadsForUser(user: SessionUser) {
  const isAdmin = user.role !== 'user'
  const inboxIds = await inboxRecipientIdsFor(user)

  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      let q: any = supa.from('bitduck_messages').select('*').order('created_at', { ascending: false }).limit(3000)
      if (!isAdmin) q = q.eq('thread_key', threadKeyForUser(user.id))
      const { data, error } = await q
      if (!error) return normalizeThreadSummaries((data || []) as any[], inboxIds)
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const rows = isAdmin
    ? (db.prepare(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 3000`).all() as any[])
    : (db.prepare(`SELECT * FROM messages WHERE thread_key = ? ORDER BY created_at DESC LIMIT 3000`).all(threadKeyForUser(user.id)) as any[])
  return normalizeThreadSummaries(rows, inboxIds)
}

function normalizeThreadSummaries(rows: any[], inboxIds: number[]) {
  const out = new Map<
    string,
    {
      threadKey: string
      userId: number
      lastMessage: string
      lastAt: string
      unreadCount: number
      lastSenderId: number
      subject: string
    }
  >()
  for (const m of rows) {
    const threadKey = String(m.thread_key || '')
    const userId = Number(String(threadKey).replace('user:', '')) || 0
    const unread = inboxIds.includes(Number(m.recipient_id)) && !m.read_at ? 1 : 0
    const prev = out.get(threadKey)
    if (!prev) {
      out.set(threadKey, {
        threadKey,
        userId,
        lastMessage: String(m.body || ''),
        lastAt: String(m.created_at || ''),
        unreadCount: unread,
        lastSenderId: Number(m.sender_id || 0),
        subject: String(m.subject || '')
      })
      continue
    }
    prev.unreadCount += unread
  }
  return Array.from(out.values()).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
}

function toIdList(v: number | number[]): number[] {
  return (Array.isArray(v) ? v : [v]).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
}

export async function markThreadAsRead(threadKey: string, userIds: number | number[]) {
  const ids = toIdList(userIds)
  if (!ids.length) return
  const readAt = nowIso()
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      await supa.from('bitduck_messages').update({ read_at: readAt }).eq('thread_key', threadKey).in('recipient_id', ids).is('read_at', null)
      return
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const marks = ids.map(() => '?').join(',')
  db.prepare(`UPDATE messages SET read_at = ? WHERE thread_key = ? AND recipient_id IN (${marks}) AND read_at IS NULL`).run(readAt, threadKey, ...ids)
}

export async function countUnreadMessages(userIds: number | number[]) {
  const ids = toIdList(userIds)
  if (!ids.length) return 0
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { count, error } = await supa
        .from('bitduck_messages')
        .select('*', { count: 'exact', head: true })
        .in('recipient_id', ids)
        .is('read_at', null)
      if (!error) return Number(count || 0)
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const marks = ids.map(() => '?').join(',')
  const row = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE recipient_id IN (${marks}) AND read_at IS NULL`).get(...ids) as any
  return Number(row?.c || 0)
}

// 입출금센터 알림: 회원의 지갑 입금/출금 요청을 총관리자에게 쪽지로 알린다.
// - 그 회원의 대화창(thread_key = user:<memberId>)에 남겨서 관리자가 문맥과 함께 볼 수 있게 하고,
// - sender_id를 회원이 아니라 운영자 계정으로 넣어서, 회원 본인 채팅에는 "내가 admin에게 보낸 것"으로
//   보이지 않게 한다(회원 화면에서는 sender_id === 내 id 여야 "내가 보낸 말풍선"으로 표시됨).
// - 화면 표시용 발신자 이름은 subject 마커("입출금센터")로 구분해 실제 계정명 대신 보여준다.
export const WALLET_NOTICE_SUBJECT = '입출금센터'

async function getMemberProfileForNotice(memberId: number) {
  try {
    if (supabaseAppDbEnabled()) {
      const supa = getSupabaseAdminClient()
      const { data } = await supa
        .from('bitduck_users')
        .select('username, name, birth_date, bank_name, bank_account, account_holder, referral_code')
        .eq('id', memberId)
        .maybeSingle()
      return (data as any) || null
    }
    return (getDb().prepare('SELECT username, name, birth_date, bank_name, bank_account, account_holder, referral_code FROM users WHERE id = ?').get(memberId) as any) || null
  } catch {
    return null
  }
}

// 입금/출금 요청이 들어오면 텔레그램 방으로 회원 정보와 함께 한글로 알린다.
async function notifyTelegramOfWalletRequest(memberId: number, kind: 'deposit' | 'withdrawal', krwAmount: number) {
  const label = kind === 'deposit' ? '입금' : '출금'
  const amountText = `${Math.round(Number(krwAmount) || 0).toLocaleString('en-US')}원`
  const u = await getMemberProfileForNotice(memberId)
  const dash = (v: any) => (String(v || '').trim() ? String(v).trim() : '-')
  const nameWithId = u ? (u.name ? `${u.name}(${u.username})` : dash(u.username)) : '-'
  const bank = u ? `${dash(u.bank_name)}(${dash(u.bank_account)})` : '-'
  const text = [
    `${label}요청이 접수되었습니다.`,
    `(신청 금액: ${amountText})`,
    '',
    `이름 : ${nameWithId}`,
    `생년월일 : ${dash(u?.birth_date)}`,
    `은행 : ${bank}`,
    `예금주 : ${dash(u?.account_holder)}`,
    `추천코드 : ${dash(u?.referral_code)}`
  ].join('\n')
  await sendTelegramText(text)
}

// 새 회원이 가입하면 텔레그램 방으로 가입 정보를 한글로 알린다(입금/출금 요청 알림과 같은 형식). 비밀번호는 보내지 않는다.
// 알림이 실패해도 가입 처리에는 영향이 없다.
export async function notifyTelegramOfSignup(info: {
  username: string
  name: string
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
}) {
  try {
    const dash = (v: any) => (String(v || '').trim() ? String(v).trim() : '-')
    const nameWithId = info.name ? `${info.name}(${dash(info.username)})` : dash(info.username)
    const text = [
      '새로운 회원이 가입했습니다.',
      '',
      `이름 : ${nameWithId}`,
      `생년월일 : ${dash(info.birthDate)}`,
      `은행 : ${dash(info.bankName)}(${dash(info.bankAccount)})`,
      `예금주 : ${dash(info.accountHolder)}`,
      `추천코드 : ${dash(info.referralCode)}`
    ].join('\n')
    await sendTelegramText(text)
  } catch (e: any) {
    console.error('[signup-notice] telegram notify failed:', e?.message || e)
  }
}

export async function notifyAdminOfWalletRequest(memberId: number, kind: 'deposit' | 'withdrawal', krwAmount: number) {
  // 텔레그램 알림은 쪽지 알림과 별개로 항상 시도한다(실패해도 요청 처리에는 영향 없음).
  await notifyTelegramOfWalletRequest(memberId, kind, krwAmount).catch((e) => {
    console.error('[wallet-notice] telegram notify failed:', e?.message || e)
  })
  const operator = await getOperatorAdminUser()
  if (!operator) return
  const label = kind === 'deposit' ? '입금' : '출금'
  const amountText = `${Math.round(Number(krwAmount) || 0).toLocaleString()}원`
  await insertMessages([
    {
      thread_key: threadKeyForUser(memberId),
      sender_id: operator.id,
      recipient_id: operator.id,
      subject: WALLET_NOTICE_SUBJECT,
      body: `${label}요청이 접수되었습니다. (신청 금액: ${amountText})`,
      read_at: null
    }
  ])
}

export async function ensureAdminThreadAccess(user: SessionUser, targetUserId?: number) {
  if (user.role !== 'user') {
    if (!targetUserId) {
      throw createError({ statusCode: 400, statusMessage: '대화 대상 회원이 필요합니다.' })
    }
    return { threadKey: threadKeyForUser(targetUserId), targetUserId: Number(targetUserId) }
  }
  return { threadKey: threadKeyForUser(user.id), targetUserId: user.id }
}
