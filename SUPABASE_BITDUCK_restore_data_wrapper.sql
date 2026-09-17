-- apps_data.sql을 FK/트리거 순서 제약 없이 한번에 불러오기 위한 래퍼.
-- 실행: psql "postgresql://postgres:dbsFJKJ123%21%40%23@db.dyfycrmltqosezmsufup.supabase.co:5432/postgres" -f SUPABASE_BITDUCK_restore_data_wrapper.sql

set session_replication_role = replica;
\i apps_data.sql
set session_replication_role = default;
