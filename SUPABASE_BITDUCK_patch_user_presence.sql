-- 실시간 접속: 회원이 지금 보고 있는 화면(경로) 기록용 테이블
create table if not exists public.bitduck_user_presence (
  user_id bigint primary key,
  path text not null,
  updated_at timestamptz not null default now()
);

alter table public.bitduck_user_presence enable row level security;
