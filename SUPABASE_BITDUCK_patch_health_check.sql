-- DB 연결 상태(health-check) 기능에 필요한 컬럼을 bitduck_system_settings에 추가합니다.
-- 실행: psql "postgresql://postgres.mbywcrniwwvlkrncxfky:dbsFJKJ123%21%40%23@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -f SUPABASE_BITDUCK_patch_health_check.sql

alter table bitduck_system_settings add column if not exists health_marker text;
alter table bitduck_system_settings add column if not exists health_checked_at timestamptz;

notify pgrst, 'reload schema';
