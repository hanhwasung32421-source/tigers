// 부관리자별로 총관리자가 관리자 메뉴 접근/수정 권한을 조정할 수 있게 하는 스키마.
// 기존 permissions JSON 컬럼(canViewUsers/canCredit 등)과 함께 permissions.menus 아래에 저장한다.

export const ADMIN_MENU_KEYS = ['members', 'online', 'trades', 'transfers', 'positions', 'messages', 'settlement'] as const
export type AdminMenuKey = (typeof ADMIN_MENU_KEYS)[number]

// 메뉴별로 "수정" 권한 토글이 의미 있는 항목만 editable: true
export const MENU_META: Record<AdminMenuKey, { label: string; editable: boolean; editLabel?: string }> = {
  members: { label: '회원 목록', editable: true, editLabel: '보유금액 수정' },
  online: { label: '실시간 접속', editable: false },
  trades: { label: '거래 내역', editable: false },
  transfers: { label: '입출금 내역', editable: false },
  positions: { label: '포지션 목록', editable: true, editLabel: '포지션 수정' },
  messages: { label: '쪽지관리', editable: false },
  settlement: { label: '정산내역', editable: true, editLabel: '입금 승인/거절' }
}

export type SettlementType = 'loss' | 'referral'
export const SETTLEMENT_TYPES: SettlementType[] = ['loss', 'referral']

// 부관리자가 정산내역에서 볼 수 있는 정산 유형(손실정산/레퍼럴정산). 총관리자는 항상 둘 다.
export function settlementTypesOf(user: { role?: string; permissions?: any } | null | undefined): SettlementType[] {
  if (!user) return []
  if (user.role === 'super_admin') return [...SETTLEMENT_TYPES]
  const raw = user.permissions?.settlementTypes
  if (!Array.isArray(raw)) return [...SETTLEMENT_TYPES] // 미설정 시 기본값: 둘 다 허용
  return raw.filter((v): v is SettlementType => SETTLEMENT_TYPES.includes(v))
}

export type MenuPermission = { view: boolean; edit: boolean }
export type MenuPermissions = Record<AdminMenuKey, MenuPermission>

export function defaultMenuPermissions(): MenuPermissions {
  const out = {} as MenuPermissions
  for (const key of ADMIN_MENU_KEYS) {
    out[key] = { view: true, edit: false }
  }
  return out
}

export function normalizeMenuPermissions(input: any): MenuPermissions {
  const out = defaultMenuPermissions()
  if (!input || typeof input !== 'object') return out
  for (const key of ADMIN_MENU_KEYS) {
    const v = input[key]
    if (v && typeof v === 'object') {
      out[key] = {
        view: v.view !== false,
        edit: Boolean(v.edit)
      }
    }
  }
  return out
}

export function menuPermissionsOf(user: { role?: string; permissions?: any } | null | undefined): MenuPermissions {
  if (!user) return defaultMenuPermissions()
  if (user.role === 'super_admin') {
    const all = defaultMenuPermissions()
    for (const key of ADMIN_MENU_KEYS) {
      all[key] = { view: true, edit: true }
    }
    return all
  }
  return normalizeMenuPermissions(user.permissions?.menus)
}

export function canViewMenu(user: { role?: string; permissions?: any } | null | undefined, key: AdminMenuKey): boolean {
  if (user?.role === 'super_admin') return true
  return menuPermissionsOf(user)[key]?.view !== false
}

export function canEditMenu(user: { role?: string; permissions?: any } | null | undefined, key: AdminMenuKey): boolean {
  if (user?.role === 'super_admin') return true
  return Boolean(menuPermissionsOf(user)[key]?.edit)
}
