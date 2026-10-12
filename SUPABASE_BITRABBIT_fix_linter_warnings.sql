-- ============================================================================
-- Supabase 린터 경고 수정. 세 함수(handle_new_user/is_admin/set_updated_at)는
-- BITRABBIT 코드 어디서도 호출하지 않는 걸 확인했습니다 — 예전에 이 Supabase
-- 프로젝트를 썼던 다른 앱(Supabase Auth 연동)의 잔재로 보입니다.
--
-- 지금 바로 실행해도 안전합니다(BITRABBIT 기능에 영향 없음).
-- ============================================================================

-- 1) search_path 고정 (함수 하이재킹 방지 — 린터가 지적한 3개 함수 전부)
alter function public.set_updated_at() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- 2) 가장 급한 것: handle_new_user을 로그인 안 한 사람도 직접 호출할 수 있던 걸 막음
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
