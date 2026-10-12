-- ============================================================================
-- BITDUCK → BITRABBIT 복제 (같은 Supabase 프로젝트 안에서 bitduck_* 를 bitrabbit_* 로 복사)
--
-- 이 파일은 "복사"만 합니다. bitduck_* 테이블/함수는 읽기만 하고 절대 수정·삭제하지 않으므로
-- 기존 BITDUCK 사이트는 그대로 동작합니다.
--
-- 실행: 기존(공유) Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행하세요.
--
-- 하는 일 (전부 한 트랜잭션 — 중간에 오류가 나면 아무것도 반영되지 않음):
--   1) public.bitduck_* 테이블마다 같은 구조의 public.bitrabbit_* 테이블 생성
--      (컬럼, 기본값, NOT NULL, CHECK, PK/UNIQUE, 인덱스, identity 포함)
--   2) 데이터 전체 복사 (INSERT ... SELECT)
--   3) serial 방식 시퀀스는 bitrabbit_* 전용 시퀀스를 새로 만들어 연결 (옛 시퀀스 공유 방지)
--   4) 외래키(FK)가 있으면 bitrabbit_* 끼리 연결하도록 다시 생성
--   5) bitduck_* 이름의 함수(예: bitduck_rate_limit_hit)를 bitrabbit_* 로 복제
--   6) 시퀀스 번호를 실제 최대 id 다음으로 맞춤, RLS 켜기, anon/authenticated 접근 차단
--   7) PostgREST 스키마 캐시 새로고침
--
-- 다시 실행해도 안전: 이미 bitrabbit_* 테이블이 있으면 그 테이블은 건너뜁니다(덮어쓰지 않음).
-- 처음부터 다시 복제하고 싶으면 맨 아래 "초기화" 블록을 먼저 실행하세요(bitrabbit_* 만 삭제).
-- 복제 중에도 BITDUCK이 계속 쓰이는 상태면, 복제 이후에 생긴 데이터는 빠질 수 있으니
-- 가능하면 사용자가 적은 시간대에 실행하세요.
-- ============================================================================

do $$
declare
  r record;
  new_name text;
  new_seq text;
  cols text;
  copied_rows bigint;
  def text;
  copied_tables text[] := '{}';
begin
  -- 1) + 2) 테이블 복제 및 데이터 복사
  for r in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and left(c.relname, 8) = 'bitduck_' and c.relkind in ('r', 'p')
    order by c.relname
  loop
    new_name := 'bitrabbit_' || substr(r.relname, 9);

    if to_regclass(format('public.%I', new_name)) is not null then
      raise notice '건너뜀(이미 있음): %', new_name;
      continue;
    end if;

    execute format('create table public.%I (like public.%I including all)', new_name, r.relname);

    -- 일반(생성 컬럼이 아닌) 컬럼만 골라서 복사
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into cols
    from pg_attribute a
    where a.attrelid = format('public.%I', r.relname)::regclass
      and a.attnum > 0 and not a.attisdropped and a.attgenerated = '';

    execute format(
      'insert into public.%I (%s) overriding system value select %s from public.%I',
      new_name, cols, cols, r.relname
    );
    get diagnostics copied_rows = row_count;
    raise notice '복제: % → % (% 행)', r.relname, new_name, copied_rows;
    copied_tables := copied_tables || new_name;
  end loop;

  -- 3) serial 방식(default nextval(옛 시퀀스))으로 만들어진 컬럼은 새 시퀀스로 교체
  for r in
    select c.relname as tablename, a.attname as colname
    from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where n.nspname = 'public'
      and c.relname = any (copied_tables)
      and a.attidentity = ''
      and pg_get_expr(d.adbin, d.adrelid) like 'nextval(%bitduck\_%'
  loop
    new_seq := r.tablename || '_' || r.colname || '_seq';
    execute format('create sequence if not exists public.%I', new_seq);
    execute format(
      'alter table public.%I alter column %I set default nextval(%L::regclass)',
      r.tablename, r.colname, format('public.%I', new_seq)
    );
    execute format('alter sequence public.%I owned by public.%I.%I', new_seq, r.tablename, r.colname);
  end loop;

  -- 4) 외래키: bitduck_* 끼리의 FK를 bitrabbit_* 끼리로 다시 만든다
  for r in
    select cl.relname as tablename, con.conname, pg_get_constraintdef(con.oid) as condef
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and con.contype = 'f' and left(cl.relname, 8) = 'bitduck_'
      and ('bitrabbit_' || substr(cl.relname, 9)) = any (copied_tables)
  loop
    execute format(
      'alter table public.%I add constraint %I %s',
      'bitrabbit_' || substr(r.tablename, 9),
      'bitrabbit_' || substr(r.conname, case when left(r.conname, 8) = 'bitduck_' then 9 else 1 end),
      replace(r.condef, 'bitduck_', 'bitrabbit_')
    );
  end loop;

  -- 5) 함수: 이름이 bitduck_ 로 시작하는 것만 복제 (원본 함수는 그대로 둔다)
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and left(p.proname, 8) = 'bitduck_'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    def := replace(pg_get_functiondef(r.oid), 'bitduck_', 'bitrabbit_');
    execute def;
    raise notice '함수 복제: % → %', r.proname, 'bitrabbit_' || substr(r.proname, 9);
  end loop;

  -- bitduck_ 가 아닌 이름의 함수·트리거·정책이 bitduck_ 테이블을 쓰고 있으면 알려준다(자동 복제하지 않음)
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and left(p.proname, 8) <> 'bitduck_' and p.prosrc like '%bitduck\_%'
  loop
    raise notice '확인 필요: 함수 %(이)가 bitduck_ 테이블을 참조합니다(자동 복제 안 함)', r.proname;
  end loop;

  for r in
    select cl.relname, t.tgname from pg_trigger t join pg_class cl on cl.oid = t.tgrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and not t.tgisinternal and left(cl.relname, 8) = 'bitduck_'
  loop
    raise notice '확인 필요: 트리거 % (테이블 %)는 복제되지 않았습니다', r.tgname, r.relname;
  end loop;

  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and left(tablename, 8) = 'bitduck_'
  loop
    raise notice '확인 필요: 정책 % (테이블 %)는 복제되지 않았습니다', r.policyname, r.tablename;
  end loop;

  -- 6) 시퀀스 번호 맞추기 + RLS + 권한 (이번에 새로 만든 테이블만)
  foreach new_name in array copied_tables loop
    for r in
      select a.attname
      from pg_attribute a
      where a.attrelid = format('public.%I', new_name)::regclass and a.attnum > 0 and not a.attisdropped
        and pg_get_serial_sequence(format('public.%I', new_name), a.attname) is not null
    loop
      execute format(
        'select setval(pg_get_serial_sequence(%L, %L), coalesce(max(%I), 0) + 1, false) from public.%I',
        format('public.%I', new_name), r.attname, r.attname, new_name
      );
    end loop;

    execute format('alter table public.%I enable row level security', new_name);
    execute format('revoke all on table public.%I from anon, authenticated', new_name);
    execute format('grant all on table public.%I to service_role', new_name);
  end loop;

  -- rate limit RPC는 service_role만 호출 가능하게
  if to_regprocedure('public.bitrabbit_rate_limit_hit(text, integer)') is not null then
    revoke all on function public.bitrabbit_rate_limit_hit(text, integer) from public, anon, authenticated;
    grant execute on function public.bitrabbit_rate_limit_hit(text, integer) to service_role;
  end if;
end $$;

-- 7) PostgREST 스키마 캐시 즉시 갱신
notify pgrst, 'reload schema';

-- ============================================================================
-- 확인용 쿼리 — 결과의 row_match 가 전부 true 여야 정상입니다.
-- ============================================================================
select
  t.tablename as bitduck_table,
  'bitrabbit_' || substr(t.tablename, 9) as bitrabbit_table,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::bigint as bitduck_rows,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', 'bitrabbit_' || substr(t.tablename, 9)), false, true, '')))[1]::text::bigint as bitrabbit_rows,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::bigint
    = (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', 'bitrabbit_' || substr(t.tablename, 9)), false, true, '')))[1]::text::bigint as row_match
from pg_tables t
where t.schemaname = 'public' and left(t.tablename, 8) = 'bitduck_'
order by t.tablename;


-- ============================================================================
-- (선택) 초기화: 복제를 처음부터 다시 하고 싶을 때만, 위 본문보다 먼저 이 블록만 따로 실행하세요.
-- bitrabbit_* 테이블/함수만 삭제하며 bitduck_* 는 건드리지 않습니다. (주석 해제 후 실행)
-- ============================================================================
-- do $$
-- declare r record;
-- begin
--   for r in select tablename from pg_tables where schemaname = 'public' and left(tablename, 10) = 'bitrabbit_' loop
--     execute format('drop table if exists public.%I cascade', r.tablename);
--   end loop;
--   for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--            where n.nspname = 'public' and left(p.proname, 10) = 'bitrabbit_' loop
--     execute format('drop function if exists %s cascade', r.sig);
--   end loop;
-- end $$;
