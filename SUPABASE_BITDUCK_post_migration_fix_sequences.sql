-- 데이터 복원 후 APPS 프로젝트에서 실행: 자동증가 id 컬럼을 쓰는 5개 테이블의
-- 시퀀스를 실제 데이터의 최대값 다음으로 맞춰서, 이후 신규 저장 시 id 충돌을 막습니다.
-- (bitduck_data.sql에 이미 setval(...) 구문이 있다면 이 파일은 안 돌려도 됩니다.)

select setval(pg_get_serial_sequence('public.bitduck_profit_cards', 'id'), coalesce(max(id), 0) + 1, false) from public.bitduck_profit_cards;
select setval(pg_get_serial_sequence('public.bitduck_log_users', 'id'), coalesce(max(id), 0) + 1, false) from public.bitduck_log_users;
select setval(pg_get_serial_sequence('public.bitduck_log_logins', 'id'), coalesce(max(id), 0) + 1, false) from public.bitduck_log_logins;
select setval(pg_get_serial_sequence('public.bitduck_log_buys', 'id'), coalesce(max(id), 0) + 1, false) from public.bitduck_log_buys;
select setval(pg_get_serial_sequence('public.bitduck_log_credits', 'id'), coalesce(max(id), 0) + 1, false) from public.bitduck_log_credits;
