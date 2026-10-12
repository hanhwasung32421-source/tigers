-- ============================================================================
-- 지금 당장 실행해도 안전합니다(서버는 service role key만 쓰므로 RLS를 켜도
-- 앱 동작에는 전혀 영향이 없습니다 — service role은 RLS를 항상 무시합니다).
-- 정책(policy)을 하나도 안 만들어도, RLS만 켜두면 anon/authenticated 키로는
-- 기본적으로 전부 접근 거부가 되어서 "Unrestricted" 공개 노출이 닫힙니다.
--
-- trae_/app_ 이름을 아직 bitduck_로 안 바꿨어도 지금 바로 실행 가능하고,
-- 나중에 이름을 바꿔도(RENAME) RLS 설정은 테이블에 그대로 남아있습니다.
-- ============================================================================

alter table if exists public.trae_users enable row level security;
alter table if exists public.trae_balances enable row level security;
alter table if exists public.trae_positions enable row level security;
alter table if exists public.trae_trades enable row level security;
alter table if exists public.trae_profit_cards enable row level security;
alter table if exists public.trae_user_settings enable row level security;
alter table if exists public.trae_sessions enable row level security;
alter table if exists public.trae_deposit_requests enable row level security;
alter table if exists public.trae_guest_chats enable row level security;
alter table if exists public.trae_kill_events enable row level security;
alter table if exists public.trae_profit_events enable row level security;
alter table if exists public.trae_password_reset_requests enable row level security;
alter table if exists public.trae_admin_roles enable row level security;
alter table if exists public.trae_system_settings enable row level security;
alter table if exists public.trae_messages enable row level security;

alter table if exists public.app_users enable row level security;
alter table if exists public.app_login_events enable row level security;
alter table if exists public.app_buys enable row level security;
alter table if exists public.app_admin_credits enable row level security;

-- 이름을 bitduck_*로 이미 바꿨다면 위 대신 이걸 실행하세요(둘 다 실행해도 무방 - if exists라 에러 안 남)
alter table if exists public.bitduck_users enable row level security;
alter table if exists public.bitduck_balances enable row level security;
alter table if exists public.bitduck_positions enable row level security;
alter table if exists public.bitduck_trades enable row level security;
alter table if exists public.bitduck_profit_cards enable row level security;
alter table if exists public.bitduck_user_settings enable row level security;
alter table if exists public.bitduck_sessions enable row level security;
alter table if exists public.bitduck_deposit_requests enable row level security;
alter table if exists public.bitduck_guest_chats enable row level security;
alter table if exists public.bitduck_kill_events enable row level security;
alter table if exists public.bitduck_profit_events enable row level security;
alter table if exists public.bitduck_password_reset_requests enable row level security;
alter table if exists public.bitduck_admin_roles enable row level security;
alter table if exists public.bitduck_system_settings enable row level security;
alter table if exists public.bitduck_messages enable row level security;
alter table if exists public.bitduck_log_users enable row level security;
alter table if exists public.bitduck_log_logins enable row level security;
alter table if exists public.bitduck_log_buys enable row level security;
alter table if exists public.bitduck_log_credits enable row level security;
