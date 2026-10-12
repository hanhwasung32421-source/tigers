-- ============================================================================
-- trae_ 로 시작하던 기존 테이블 이름을 bitrabbit_ 으로, 로그용 app_ 테이블 4개는
-- bitrabbit_log_* 로 전부 정리합니다(app_users/app_admin_credits를 그냥 bitrabbit_users/
-- bitrabbit_admin_roles로 바꾸면 실제 회원/역할 테이블과 이름이 겹쳐서 log_ 를 더 붙였습니다).
-- ALTER TABLE ... RENAME은 데이터를 그대로 유지한 채 이름만 바꾸므로 안전합니다.
-- "IF EXISTS"를 붙여서, 이미 이름이 bitrabbit_ 으로 바뀐 뒤 다시 실행해도(또는 애초에
-- 일부 테이블을 만든 적이 없어도) 에러 없이 넘어갑니다.
--
-- 중요: 이 SQL을 실행하는 즉시 기존 이름(trae_*/app_*)으로는 더 이상 조회가 안 됩니다.
-- 코드도 이미 bitrabbit_* 이름을 쓰도록 배포되어 있어야 하므로, 반드시 앱이 새 버전으로
-- 배포 완료된 직후에 바로 실행해주세요(배포 전에 미리 실행하면 그 사이에 잠깐 에러가 납니다).
-- ============================================================================

alter table if exists public.trae_users rename to bitrabbit_users;
alter table if exists public.trae_balances rename to bitrabbit_balances;
alter table if exists public.trae_positions rename to bitrabbit_positions;
alter table if exists public.trae_trades rename to bitrabbit_trades;
alter table if exists public.trae_profit_cards rename to bitrabbit_profit_cards;
alter table if exists public.trae_user_settings rename to bitrabbit_user_settings;
alter table if exists public.trae_sessions rename to bitrabbit_sessions;
alter table if exists public.trae_deposit_requests rename to bitrabbit_deposit_requests;
alter table if exists public.trae_guest_chats rename to bitrabbit_guest_chats;
alter table if exists public.trae_kill_events rename to bitrabbit_kill_events;
alter table if exists public.trae_profit_events rename to bitrabbit_profit_events;
alter table if exists public.trae_password_reset_requests rename to bitrabbit_password_reset_requests;
alter table if exists public.trae_admin_roles rename to bitrabbit_admin_roles;
alter table if exists public.trae_system_settings rename to bitrabbit_system_settings;
alter table if exists public.trae_messages rename to bitrabbit_messages;

-- 로그용 app_ 테이블 4개(실제로 쓰이고 있어서 삭제 대상이 아니라 이름만 정리)
alter table if exists public.app_users rename to bitrabbit_log_users;
alter table if exists public.app_login_events rename to bitrabbit_log_logins;
alter table if exists public.app_buys rename to bitrabbit_log_buys;
alter table if exists public.app_admin_credits rename to bitrabbit_log_credits;

-- 인덱스 이름도 같이 정리(선택사항 — 안 해도 동작에는 지장 없음, 그냥 이름만 깔끔해짐)
alter index if exists public.trae_positions_user_id_idx rename to bitrabbit_positions_user_id_idx;
alter index if exists public.trae_trades_user_id_idx rename to bitrabbit_trades_user_id_idx;
alter index if exists public.trae_profit_cards_user_id_idx rename to bitrabbit_profit_cards_user_id_idx;
alter index if exists public.trae_sessions_user_id_idx rename to bitrabbit_sessions_user_id_idx;
alter index if exists public.trae_sessions_expires_at_idx rename to bitrabbit_sessions_expires_at_idx;
alter index if exists public.trae_deposit_requests_user_idx rename to bitrabbit_deposit_requests_user_idx;
alter index if exists public.trae_guest_chats_guest_id_idx rename to bitrabbit_guest_chats_guest_id_idx;
alter index if exists public.trae_guest_chats_created_at_idx rename to bitrabbit_guest_chats_created_at_idx;
alter index if exists public.trae_kill_events_symbol_idx rename to bitrabbit_kill_events_symbol_idx;
alter index if exists public.trae_profit_events_symbol_idx rename to bitrabbit_profit_events_symbol_idx;

-- PostgREST 스키마 캐시를 즉시 갱신(안 하면 몇 분간 "컬럼/테이블을 찾을 수 없음" 에러가 날 수 있음)
notify pgrst, 'reload schema';
