-- 주의: 이 파일은 bitrabbit_* 테이블만 삭제합니다. BITRABBIT 데이터를 지우는 것이 맞는지 확인하고 실행하세요.
-- APPS 프로젝트에서 bitrabbit_ 로 시작하는 테이블을 전부 삭제합니다.
-- 데이터가 이미 새 BITRABBIT 프로젝트로 이전 및 검증 완료된 상태에서, 옛 APPS 쪽 사본을 정리하는 용도입니다.
-- public 스키마 자체나 다른 접두사 테이블(bcmk_game_sessions 등)은 건드리지 않습니다.
--
-- 실행: psql "postgresql://postgres.YOUR_PROJECT_REF:[APPS_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -f SUPABASE_APPS_drop_bitrabbit_tables.sql

do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public' and tablename like 'bitrabbit\_%') loop
    raise notice 'dropping table: %', r.tablename;
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- 확인: 아래 쿼리 결과가 0행이어야 정상적으로 삭제된 것입니다.
select tablename from pg_tables where schemaname = 'public' and tablename like 'bitrabbit\_%';
