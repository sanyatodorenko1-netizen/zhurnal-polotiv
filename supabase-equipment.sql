-- Separate equipment registry. Existing flight records and users are not modified.
create table if not exists public.flight_equipment (
 id uuid primary key default gen_random_uuid(),
 platform_kind text not null check (platform_kind in ('НРК','Вампір','HEAVY SHOT')),
 board_number text not null check (length(trim(board_number)) between 1 and 120),
 model text not null default '',
 status text not null check (status in ('vp','warehouse','repair','lost')),
 notes text not null default '',
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id) on delete restrict,
 unique (platform_kind,board_number)
);
alter table public.flight_equipment enable row level security;
revoke all on public.flight_equipment from anon, public;
grant select,insert,update on public.flight_equipment to authenticated;
drop policy if exists "Assigned users read equipment" on public.flight_equipment;
create policy "Assigned users read equipment" on public.flight_equipment for select to authenticated
 using ((select public.current_flight_role()) in ('admin','moderator','executor','viewer'));
drop policy if exists "Admins add equipment" on public.flight_equipment;
create policy "Admins add equipment" on public.flight_equipment for insert to authenticated
 with check ((select public.current_flight_role()) = 'admin' and updated_by = (select auth.uid()));
drop policy if exists "Admins update equipment" on public.flight_equipment;
create policy "Admins update equipment" on public.flight_equipment for update to authenticated
 using ((select public.current_flight_role()) = 'admin')
 with check ((select public.current_flight_role()) = 'admin' and updated_by = (select auth.uid()));