-- Pending registration = an auth account without a journal role.
-- No existing accounts, roles or journal rows are changed.
begin;
create or replace function public.list_pending_flight_users()
returns table(user_id uuid, email text, registered_at timestamptz, email_confirmed boolean)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if public.current_flight_role() is distinct from 'admin' then
    raise exception 'Admin required' using errcode='42501';
  end if;
  return query select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null
    from auth.users u
    where not exists (select 1 from public.flight_user_roles r where r.user_id=u.id)
    order by u.created_at asc limit 200;
end;
$$;
revoke all on function public.list_pending_flight_users() from public, anon;
grant execute on function public.list_pending_flight_users() to authenticated;
commit;
