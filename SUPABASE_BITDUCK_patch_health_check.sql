-- DB 연결 상태(health-check) 기능에 필요한 컬럼을 bitduck_system_settings에 추가합니다.
-- 실행: psql "postgresql://postgres.mbywcrniwwvlkrncxfky:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -f SUPABASE_BITDUCK_patch_health_check.sql
-- [DB_PASSWORD]는 Supabase 대시보드 > Settings > Database > Connection string에서 확인 (절대 파일/커밋에 남기지 말 것)

alter table bitduck_system_settings add column if not exists health_marker text;
alter table bitduck_system_settings add column if not exists health_checked_at timestamptz;

notify pgrst, 'reload schema';
