-- Run after supabase-equipment.sql and supabase-board-terminals.sql.
-- Adds the platform to allowed types. Does not update rows or users.
begin;
alter table public.flight_equipment drop constraint if exists flight_equipment_platform_kind_check;
alter table public.flight_equipment add constraint flight_equipment_platform_kind_check
 check (platform_kind in ('НРК','Вампір','HEAVY SHOT'));
alter table public.flight_board_terminals drop constraint if exists flight_board_terminals_platform_kind_check;
alter table public.flight_board_terminals add constraint flight_board_terminals_platform_kind_check
 check (platform_kind in ('НРК','Вампір','HEAVY SHOT'));
commit;