-- Allow assigned admins, moderators and executors to add equipment.
-- Viewers retain read-only access. Existing equipment updates remain admin-only.
begin;

drop policy if exists "Admins add equipment" on public.flight_equipment;
drop policy if exists "Assigned users add equipment" on public.flight_equipment;

create policy "Assigned users add equipment" on public.flight_equipment
  for insert to authenticated
  with check (
    (select public.current_flight_role()) in ('admin', 'moderator', 'executor')
    and updated_by = (select auth.uid())
  );

commit;
