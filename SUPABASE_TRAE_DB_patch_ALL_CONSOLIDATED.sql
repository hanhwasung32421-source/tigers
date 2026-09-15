-- ============================================================================
-- BITDUCK: 지금까지 나온 모든 Supabase 패치를 한 번에 모아놓은 파일입니다.
-- 전부 "이미 있으면 건너뛰기"(if not exists / on conflict do nothing) 방식이라
-- 몇 번을 실행해도, 이미 적용된 패치가 섞여 있어도 안전합니다.
--
-- 이걸 한 번 실행해두면 "컬럼/테이블이 없어서 500 에러" 종류의 문제가
-- 한꺼번에 해소됩니다. Supabase SQL Editor에서 전체 선택 후 실행하세요.
-- ============================================================================

-- 강제청산(%) 기준 테이블
create table if not exists public.trae_system_settings (
  id integer primary key,
  liquidation_roe numeric not null default -40,
  updated_at timestamptz not null default now()
);

insert into public.trae_system_settings (id, liquidation_roe)
values (1, -40)
on conflict (id) do nothing;

-- 정산내역/입금요청 기능
alter table public.trae_system_settings
  add column if not exists telegram_url text not null default '';

alter table public.trae_system_settings
  add column if not exists krw_per_usdt numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists loss_settlement_percent numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists referral_settlement_percent numeric not null default 0;

create table if not exists public.trae_deposit_requests (
  id bigint primary key,
  user_id bigint not null,
  krw_amount numeric not null,
  status text not null default 'pending',
  usdt_amount numeric,
  rate_used numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists trae_deposit_requests_user_idx on public.trae_deposit_requests (user_id, id desc);

-- 입금요청 테이블을 입금/출금 공용으로 확장
alter table public.trae_deposit_requests
  add column if not exists type text not null default 'deposit';

-- 입출금 내역 소프트 삭제/복구
alter table public.trae_deposit_requests
  add column if not exists deleted_at timestamptz;

-- 매일 09시(KST) 고정 자동 환율 캐시
alter table public.trae_system_settings
  add column if not exists krw_auto_rate numeric not null default 0;

alter table public.trae_system_settings
  add column if not exists krw_auto_rate_day text not null default '';

alter table public.trae_system_settings
  add column if not exists krw_auto_rate_updated_at timestamptz;

-- 관리자 상단 메뉴 표시 순서
alter table public.trae_system_settings
  add column if not exists menu_order jsonb not null default '[]'::jsonb;

-- 최상단 메인 메뉴 순서·숨기기 (main_nav_hidden 기본값은 반드시 NULL이어야 함:
-- NULL="아직 설정 안 함"→기본 숨김목록 적용, 빈 배열=관리자가 "전부 표시"로 명시 저장한 것)
alter table public.trae_system_settings
  add column if not exists main_nav_order jsonb not null default '[]'::jsonb;

alter table public.trae_system_settings
  add column if not exists main_nav_hidden jsonb default null;

-- 수익카드(청산카드) 색상 커스터마이징
alter table public.trae_system_settings
  add column if not exists profit_card_style jsonb default null;

-- 역할별 관리자 메뉴 권한
create table if not exists public.trae_admin_roles (
  id text primary key,
  label text not null,
  menus jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 역할 서열(화면 표시 순서)
alter table public.trae_admin_roles
  add column if not exists sort_order integer not null default 0;

-- 역할의 실제 권한 등급(tier)
alter table public.trae_admin_roles
  add column if not exists tier integer not null default 0;

update public.trae_admin_roles set tier = sort_order where tier = 0;

-- trae_user_settings에 차트 설정 저장 컬럼(구버전 스키마 보정)
alter table public.trae_user_settings
  add column if not exists chart_prefs jsonb not null default '{}'::jsonb;

-- 관리자 킬UP/킬DOWN 이벤트 공유
create table if not exists public.trae_kill_events (
  id bigint primary key,
  symbol text not null,
  direction text not null,
  percent numeric not null,
  base_price numeric not null,
  shocked_price numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists trae_kill_events_symbol_idx on public.trae_kill_events (symbol, id desc);

-- 킬UP/킬DOWN 애니메이션 속도 조절
alter table public.trae_kill_events
  add column if not exists duration_ms integer not null default 1000;

alter table public.trae_kill_events
  add column if not exists tick_count integer not null default 3;

-- 관리자 수익/손실(상승STOP/하락STOP) 이벤트 공유
create table if not exists public.trae_profit_events (
  id bigint primary key,
  symbol text not null,
  direction text not null,
  percent numeric not null,
  base_price numeric not null,
  shocked_price numeric not null,
  duration_ms integer not null default 1000,
  tick_count integer not null default 3,
  hold_ms integer not null default 3000,
  created_at timestamptz not null default now()
);

create index if not exists trae_profit_events_symbol_idx on public.trae_profit_events (symbol, id desc);

-- 비회원 실시간 상담(첫화면 채팅)
create table if not exists public.trae_guest_chats (
  id bigint primary key,
  guest_id text not null,
  ip text null,
  sender text not null,
  body text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists trae_guest_chats_guest_id_idx on public.trae_guest_chats (guest_id);
create index if not exists trae_guest_chats_created_at_idx on public.trae_guest_chats (created_at);

-- 실행 후 PostgREST 스키마 캐시를 즉시 갱신(보통 자동으로 되지만, 방금 추가한 컬럼이
-- "Could not find the 'x' column ... in the schema cache" 에러로 바로 이어지는 걸 방지)
notify pgrst, 'reload schema';
