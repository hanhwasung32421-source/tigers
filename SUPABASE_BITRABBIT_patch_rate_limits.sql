-- 로그인/회원가입/거래 등 API 남용(브루트포스, 스팸) 방지를 위한 rate limit 카운터 테이블과
-- 원자적 증가 RPC 함수입니다. 서버리스(Vercel) 환경에서 인스턴스가 여러 개여도 정확히 세도록
-- 메모리 대신 이 테이블에 카운터를 둡니다.
-- 실행: Supabase 대시보드 > SQL Editor에서 이 파일 내용을 붙여넣고 실행하세요.

create table if not exists bitrabbit_rate_limits (
  bucket text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table bitrabbit_rate_limits enable row level security;
-- 다른 bitrabbit_* 테이블과 동일한 패턴: 앱 서버는 항상 service_role 키로 접근하므로
-- anon/authenticated용 정책은 두지 않는다(둘 다 이 테이블에 접근 불가).

create or replace function bitrabbit_rate_limit_hit(p_bucket text, p_window_seconds int)
returns table(hit_count integer, window_start timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into bitrabbit_rate_limits as t (bucket, count, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update
    set count = case
          when t.window_start < now() - (p_window_seconds || ' seconds')::interval then 1
          else t.count + 1
        end,
        window_start = case
          when t.window_start < now() - (p_window_seconds || ' seconds')::interval then now()
          else t.window_start
        end
  returning t.count, t.window_start into hit_count, window_start;
  return next;
end;
$$;

grant execute on function bitrabbit_rate_limit_hit(text, int) to service_role;

notify pgrst, 'reload schema';
