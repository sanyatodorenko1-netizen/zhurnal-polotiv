-- Спільна таблиця записів журналу.
-- Виконайте цей SQL у Supabase Dashboard → SQL Editor.
create table if not exists public.flight_records (
  id uuid primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict
);

alter table public.flight_records enable row level security;

revoke all on public.flight_records from anon, public;
grant select, insert, update, delete on public.flight_records to authenticated;

drop policy if exists "Signed-in users can read shared flight records" on public.flight_records;
create policy "Signed-in users can read shared flight records"
  on public.flight_records for select to authenticated using (true);

drop policy if exists "Signed-in users can add shared flight records" on public.flight_records;
create policy "Signed-in users can add shared flight records"
  on public.flight_records for insert to authenticated
  with check (updated_by = (select auth.uid()));

drop policy if exists "Signed-in users can edit shared flight records" on public.flight_records;
create policy "Signed-in users can edit shared flight records"
  on public.flight_records for update to authenticated
  using (true) with check (updated_by = (select auth.uid()));

drop policy if exists "Signed-in users can delete shared flight records" on public.flight_records;
create policy "Signed-in users can delete shared flight records"
  on public.flight_records for delete to authenticated using (true);
