-- Run once in the existing Supabase project's SQL Editor.
-- Adds a separate directory table. Does not modify records, roles or users.
create table if not exists public.flight_directory_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('executor','cargoType','destination','position','platformNumber','starlinkNumber')),
  value text not null check (length(trim(value)) between 1 and 120 and value = trim(value)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index if not exists flight_directory_items_category_value on public.flight_directory_items (category, lower(value));
alter table public.flight_directory_items enable row level security;
revoke all on public.flight_directory_items from anon, public;
grant select, insert on public.flight_directory_items to authenticated;
drop policy if exists "Assigned users read directories" on public.flight_directory_items;
create policy "Assigned users read directories" on public.flight_directory_items for select to authenticated
  using ((select public.current_flight_role()) in ('admin','moderator','executor','viewer'));
drop policy if exists "Admins add directories" on public.flight_directory_items;
drop policy if exists "Contributors add directories" on public.flight_directory_items;
create policy "Contributors add directories" on public.flight_directory_items for insert to authenticated
  with check ((select public.current_flight_role()) in ('admin','moderator','executor') and created_by = (select auth.uid()));