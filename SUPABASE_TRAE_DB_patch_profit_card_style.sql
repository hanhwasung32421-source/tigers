-- 수익카드(거래내역 "카드" 버튼) 배경/격자무늬 등 색상 커스터마이징을 위한 컬럼 추가.
-- Supabase SQL Editor에서 1회 실행하세요.

alter table public.trae_system_settings
  add column if not exists profit_card_style jsonb default null;
