-- apps_data.sql을 FK/트리거 순서 제약 없이 한번에 불러오기 위한 래퍼.
-- 실행: psql "postgresql://postgres:[DB_PASSWORD]@db.dyfycrmltqosezmsufup.supabase.co:5432/postgres" -f SUPABASE_BITDUCK_restore_data_wrapper.sql
-- [DB_PASSWORD]는 Supabase 대시보드 > Settings > Database > Connection string에서 확인 (절대 파일/커밋에 남기지 말 것)

set session_replication_role = replica;
\i apps_data.sql
set session_replication_role = default;
