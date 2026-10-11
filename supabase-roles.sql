-- Ролі журналу польотів. Виконайте один раз у Supabase SQL Editor.
-- Початкові користувачі отримують роль executor; початкового адміна призначаємо окремо.

create table if not exists public.flight_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'executor', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.flight_user_roles enable row level security;
revoke all on public.flight_user_roles from anon, public;
grant select on public.flight_user_roles to authenticated;

create or replace function public.current_flight_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.flight_user_roles where user_id = (select auth.uid())
$$;

revoke all on function public.current_flight_role() from public, anon;
grant execute on function public.current_flight_role() to authenticated;

drop policy if exists "Users can read their own role or admins can read all roles" on public.flight_user_roles;
create policy "Users can read their own role or admins can read all roles"
  on public.flight_user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.current_flight_role()) = 'admin');

drop policy if exists "Admins can manage flight roles" on public.flight_user_roles;
create policy "Admins can manage flight roles"
  on public.flight_user_roles for all to authenticated
  using ((select public.current_flight_role()) = 'admin')
  with check ((select public.current_flight_role()) = 'admin');

-- Зберігаємо власника запису окремо від останнього редактора.
alter table public.flight_records
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

update public.flight_records
set created_by = updated_by
where created_by is null;

alter table public.flight_records alter column created_by set not null;

-- Поточні облікові записи стають виконавцями, доки адміністратор не змінить роль.
insert into public.flight_user_roles (user_id, role)
select id, 'executor' from auth.users
on conflict (user_id) do nothing;

-- Первинний адмін, якого вказав власник журналу.
update public.flight_user_roles
set role = 'admin'
where user_id in (
  select id from auth.users where lower(email) = lower('sanyatodorenko1@gmail.com')
);

revoke all on public.flight_records from anon, public;
grant select, insert, update, delete on public.flight_records to authenticated;

drop policy if exists "Signed-in users can read shared flight records" on public.flight_records;
drop policy if exists "Signed-in users can add shared flight records" on public.flight_records;
drop policy if exists "Signed-in users can edit shared flight records" on public.flight_records;
drop policy if exists "Signed-in users can delete shared flight records" on public.flight_records;
drop policy if exists "Assigned users can read shared flight records" on public.flight_records;
drop policy if exists "Admins and executors can add flight records" on public.flight_records;
drop policy if exists "Admins and moderators can edit all records and executors can edit their own" on public.flight_records;
drop policy if exists "Admins and moderators can edit flight records" on public.flight_records;
drop policy if exists "Only admins can delete flight records" on public.flight_records;

create policy "Assigned users can read shared flight records"
  on public.flight_records for select to authenticated
  using ((select public.current_flight_role()) in ('admin', 'moderator', 'executor', 'viewer'));

create policy "Admins and executors can add flight records"
  on public.flight_records for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and created_by = (select auth.uid())
    and (select public.current_flight_role()) in ('admin', 'executor')
  );

create policy "Admins and moderators can edit flight records"
  on public.flight_records for update to authenticated
  using ((select public.current_flight_role()) in ('admin', 'moderator'))
  with check (
    updated_by = (select auth.uid())
    and (select public.current_flight_role()) in ('admin', 'moderator')
  );

create policy "Only admins can delete flight records"
  on public.flight_records for delete to authenticated
  using ((select public.current_flight_role()) = 'admin');

-- Забороняємо змінювати автора запису після створення.
create or replace function public.keep_flight_record_creator()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists keep_flight_record_creator on public.flight_records;
create trigger keep_flight_record_creator
  before update on public.flight_records
  for each row execute function public.keep_flight_record_creator();
revoke all on function public.keep_flight_record_creator() from public, anon, authenticated;

create or replace function public.set_flight_user_role(target_email text, new_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  admin_count integer;
  target_current_role text;
begin
  if (select public.current_flight_role()) is distinct from 'admin' then
    raise exception 'Only an admin can assign roles';
  end if;
  if new_role not in ('admin', 'moderator', 'executor', 'viewer') then
    raise exception 'Unknown role';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase user found for this email';
  end if;

  select count(*) into admin_count from public.flight_user_roles where role = 'admin';
  select role into target_current_role from public.flight_user_roles where user_id = target_user_id;
  if target_current_role = 'admin' and new_role <> 'admin' and admin_count <= 1 then
    raise exception 'Cannot remove the last admin';
  end if;

  insert into public.flight_user_roles (user_id, role)
  values (target_user_id, new_role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;

revoke all on function public.set_flight_user_role(text, text) from public, anon;
grant execute on function public.set_flight_user_role(text, text) to authenticated;
