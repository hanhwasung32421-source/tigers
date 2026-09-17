-- BITDUCK 프로젝트를 깨끗이 비우는 스크립트.
-- public 스키마 자체나 Supabase 내부 role 권한(anon/authenticated/service_role)은 건드리지 않고,
-- 그 안의 테이블/뷰/함수만 전부 삭제합니다 (PostgREST 인증이 깨지는 걸 방지).
--
-- 실행 방법 (BITDUCK 프로젝트에 대해):
--   psql "postgresql://postgres:dbsFJKJ123%21%40%23@db.dyfycrmltqosezmsufup.supabase.co:5432/postgres" -f SUPABASE_BITDUCK_wipe_before_migration.sql

begin;

-- 1) public 스키마의 모든 뷰 삭제
do $$
declare r record;
begin
  for r in (select viewname from pg_views where schemaname = 'public') loop
    execute 'drop view if exists public.' || quote_ident(r.viewname) || ' cascade';
  end loop;
end $$;

-- 2) public 스키마의 모든 테이블 삭제 (CASCADE로 딸린 시퀀스/제약도 함께 정리됨)
do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- 3) public 스키마에 남아있는 사용자 정의 함수 삭제
do $$
declare r record;
begin
  for r in (
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

commit;

-- 확인: 아래 쿼리 결과가 0행이어야 정상적으로 비워진 것입니다.
select tablename from pg_tables where schemaname = 'public';
