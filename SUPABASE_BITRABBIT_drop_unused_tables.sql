-- ============================================================================
-- 경고: 이 파일은 테이블을 완전히 삭제합니다(되돌릴 수 없음, 데이터 전부 사라짐).
-- 실행 전에 꼭 한번 더 확인하세요. 특히 profiles / coinbreaker / paper_buys 처럼
-- 이름만 봐서는 무슨 데이터인지 애매한 것들은, 필요하면 삭제 전에 Table Editor에서
-- 내용을 한번 열어보고 정말 필요 없는지 확인하는 걸 권장합니다.
--
-- 아래 20개 테이블은 현재 BITRABBIT 코드에서 어디서도 참조하지 않는 것을 전수 확인했습니다
-- (trae_*/bitduck_* 15개 + app_* 4개, 총 19개 "사용 중" 테이블과 비교해서 나머지 전부).
-- 이름 패턴상 이전에 이 Supabase 프로젝트를 썼던 다른 버전/다른 프로젝트(anti_ 접두사,
-- coinbreaker, 접두사 없는 구버전 스키마 등)의 잔재로 보입니다.
-- ============================================================================

-- "anti_" 접두사 그룹(이전 버전/다른 프로젝트 잔재로 추정)
drop table if exists public.anti_balances;
drop table if exists public.anti_blocked_ips;
drop table if exists public.anti_executions;
drop table if exists public.anti_positions;
drop table if exists public.anti_profit_cards;
drop table if exists public.anti_sessions;
drop table if exists public.anti_trades;
drop table if exists public.anti_users;

-- coinbreaker(다른 프로젝트로 추정)
drop table if exists public.coinbreaker;
drop table if exists public.coinbreaker_state;

-- 접두사 없는 구버전 스키마로 추정(trae_/bitduck_ 접두사 도입 이전)
drop table if exists public.executions;
drop table if exists public.login_events;
drop table if exists public.positions;
drop table if exists public.profiles;
drop table if exists public.profit_cards;
drop table if exists public.sessions;
drop table if exists public.trades;
drop table if exists public.users;

-- 기타
drop table if exists public.app_settings;
drop table if exists public.paper_buys;
