import { requireAdmin } from '../../utils/auth'
import { listRoles } from '../../utils/roles'
import { ADMIN_MENU_KEYS, MENU_META } from '../../utils/menu-permissions'

// 읽기는 모든 관리자(일반 관리자 역할 포함)가 할 수 있다 — 예: 회원 목록에서
// "코드부여"할 때 어떤 역할을 줄지 고르려면 부관리자도 역할 목록을 볼 수 있어야 한다.
// 역할 생성/수정/삭제는 총관리자만(각 엔드포인트에서 별도로 확인).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const roles = await listRoles()
  return { roles, menuKeys: ADMIN_MENU_KEYS, menuMeta: MENU_META }
})
