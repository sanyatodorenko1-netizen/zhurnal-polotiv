-- Optional additive migration. Run with the Supabase database owner only.
-- No existing tables, accounts, roles or records are modified.
begin;
create table public.admin_monthly_summaries (
  month date primary key check (extract(day from month) = 1),
  captured_at timestamptz not null default now(),
  admins bigint not null check (admins >= 0),
  moderators bigint not null check (moderators >= 0),
  executors bigint not null check (executors >= 0),
  viewers bigint not null check (viewers >= 0)
);
alter table public.admin_monthly_summaries enable row level security;
revoke all on public.admin_monthly_summaries from public, anon, authenticated;
grant select on public.admin_monthly_summaries to authenticated;
create policy "Admins read administrative snapshots"
on public.admin_monthly_summaries for select to authenticated
using ((select public.current_flight_role()) = 'admin');

-- Only this zero-argument function can write snapshots. Its fixed projection
-- contains role counts, no identity, location, equipment or flight information.
create function public.capture_admin_monthly_summary()
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.current_flight_role() is distinct from 'admin' then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  insert into public.admin_monthly_summaries (month, admins, moderators, executors, viewers)
  select date_trunc('month', now() at time zone 'Europe/Kyiv')::date,
    count(*) filter (where role = 'admin'),
    count(*) filter (where role = 'moderator'),
    count(*) filter (where role = 'executor'),
    count(*) filter (where role = 'viewer')
  from public.flight_user_roles
  on conflict (month) do nothing;
end;
$$;
revoke all on function public.capture_admin_monthly_summary() from public, anon;
grant execute on function public.capture_admin_monthly_summary() to authenticated;
commit;
