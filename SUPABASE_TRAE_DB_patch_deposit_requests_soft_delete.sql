-- 입출금 내역 소프트 삭제/복구 기능을 위한 deleted_at 컬럼 추가
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_deposit_requests
  add column if not exists deleted_at timestamptz;
