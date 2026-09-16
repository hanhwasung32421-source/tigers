-- 관리자 페이지 "DB 연결 상태" 확인 기능용 컬럼 추가.
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.bitduck_system_settings
  add column if not exists health_marker text;

alter table public.bitduck_system_settings
  add column if not exists health_checked_at timestamptz;
