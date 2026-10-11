-- Separate shared mapping. Does not modify users, directories or flight records.
create table if not exists public.flight_board_terminals (
  platform_kind text not null check (platform_kind in ('НРК','Вампір','HEAVY SHOT')),
  board_number text not null check (length(trim(board_number)) between 1 and 120),
  starlink_number text not null check (length(trim(starlink_number)) between 1 and 120),
  primary key (platform_kind, board_number)
);
alter table public.flight_board_terminals enable row level security;
revoke all on public.flight_board_terminals from anon, public;
grant select, insert, update, delete on public.flight_board_terminals to authenticated;
drop policy if exists "Assigned users read board links" on public.flight_board_terminals;
create policy "Assigned users read board links" on public.flight_board_terminals for select to authenticated
  using ((select public.current_flight_role()) in ('admin','moderator','executor','viewer'));
drop policy if exists "Admins manage board links" on public.flight_board_terminals;
drop policy if exists "Contributors manage board links" on public.flight_board_terminals;
create policy "Contributors manage board links" on public.flight_board_terminals for all to authenticated
  using ((select public.current_flight_role()) in ('admin','moderator','executor'))
  with check ((select public.current_flight_role()) in ('admin','moderator','executor'));