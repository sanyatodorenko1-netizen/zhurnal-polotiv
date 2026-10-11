-- Update existing permissions for directory forms only. No data or users changed.
begin;
grant select,insert on public.flight_directory_items to authenticated;
drop policy if exists "Admins add directories" on public.flight_directory_items;
drop policy if exists "Contributors add directories" on public.flight_directory_items;
create policy "Contributors add directories" on public.flight_directory_items
 for insert to authenticated
 with check ((select public.current_flight_role()) in ('admin','moderator','executor')
 and created_by = (select auth.uid()));
grant select,insert,update,delete on public.flight_board_terminals to authenticated;
drop policy if exists "Admins manage board links" on public.flight_board_terminals;
drop policy if exists "Contributors manage board links" on public.flight_board_terminals;
create policy "Contributors manage board links" on public.flight_board_terminals
 for all to authenticated
 using ((select public.current_flight_role()) in ('admin','moderator','executor'))
 with check ((select public.current_flight_role()) in ('admin','moderator','executor'));
commit;