-- Existing rows and user roles are preserved. Viewers remain read-only.
begin;
drop policy if exists "Admins update equipment" on public.flight_equipment;
drop policy if exists "Contributors update equipment" on public.flight_equipment;
create policy "Contributors update equipment" on public.flight_equipment
  for update to authenticated
  using ((select public.current_flight_role()) in ('admin','moderator','executor'))
  with check ((select public.current_flight_role()) in ('admin','moderator','executor') and updated_by = (select auth.uid()));
commit;
