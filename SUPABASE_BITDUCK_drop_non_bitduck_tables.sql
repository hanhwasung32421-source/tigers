-- 새 BITDUCK 프로젝트에서 bitduck_ 로 시작하지 않는 테이블(다른 프로젝트에서 섞여 들어온 것들)을 삭제합니다.
-- APPS의 public 스키마를 통째로 덤프해서 복원하는 과정에서 같이 딸려 들어온 무관한 테이블들입니다:
--   bcmk_game_sessions, cb3_coinbreaker_state, youtubeCRM_* (18개)
-- bitduck_ 로 시작하는 테이블은 전혀 건드리지 않습니다.
--
-- 실행: psql "postgresql://postgres.mbywcrniwwvlkrncxfky:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -f SUPABASE_BITDUCK_drop_non_bitduck_tables.sql
-- [DB_PASSWORD]는 Supabase 대시보드 > Settings > Database > Connection string에서 확인 (절대 파일/커밋에 남기지 말 것)

do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public' and tablename not like 'bitduck\_%') loop
    raise notice 'dropping table: %', r.tablename;
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- 확인: 아래 쿼리 결과가 0행이어야 정상적으로 삭제된 것입니다.
select tablename from pg_tables where schemaname = 'public' and tablename not like 'bitduck\_%';
