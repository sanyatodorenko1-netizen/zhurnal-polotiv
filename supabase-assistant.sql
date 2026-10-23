-- Additive only. Existing accounts, roles and journal data are not changed.
begin;
set local lock_timeout='5s';
create table public.site_feedback (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
 title text not null check(length(title) between 3 and 160),
 body text not null check(length(body) between 10 and 2000),
 created_at timestamptz not null default now()
);
alter table public.site_feedback enable row level security;
revoke all on public.site_feedback from public,anon,authenticated;
grant select on public.site_feedback to authenticated;
create policy "Own feedback or admin" on public.site_feedback for select to authenticated
using (user_id=(select auth.uid()) or (select public.current_flight_role())='admin');
create function public.submit_site_feedback(request_id uuid, feedback_title text, feedback_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or public.current_flight_role() is null then raise exception 'Assigned user required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('site-feedback:'||uid::text,0));
 if exists(select 1 from public.site_feedback where id=request_id and user_id=uid) then return request_id; end if;
 if (select count(*) from public.site_feedback where user_id=uid and created_at>=date_trunc('day',now()))>=5 then raise exception 'Daily feedback limit reached'; end if;
 insert into public.site_feedback(id,user_id,title,body) values(request_id,uid,trim(feedback_title),trim(feedback_body));
 return request_id;
end;
$$;
revoke all on function public.submit_site_feedback(uuid,text,text) from public,anon;
grant execute on function public.submit_site_feedback(uuid,text,text) to authenticated;

create table public.site_ai_usage (
 day date not null,
 user_id uuid not null references auth.users(id) on delete restrict,
 requests integer not null default 0,
 web_requests integer not null default 0,
 last_request timestamptz not null,
 primary key(day,user_id)
);
alter table public.site_ai_usage enable row level security;
revoke all on public.site_ai_usage from public,anon,authenticated;
create function public.consume_site_ai_quota(with_web boolean)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'Europe/Kyiv')::date; own_row public.site_ai_usage; total_requests bigint; total_web bigint;
begin
 if uid is null or public.current_flight_role() is null then raise exception 'Assigned user required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('site-ai-quota',0));
 select * into own_row from public.site_ai_usage where day=today and user_id=uid;
 select coalesce(sum(requests),0),coalesce(sum(web_requests),0) into total_requests,total_web from public.site_ai_usage where day=today;
 if total_requests>=100 or (with_web and total_web>=20) or coalesce(own_row.requests,0)>=20 or (with_web and coalesce(own_row.web_requests,0)>=5) or own_row.last_request>now()-interval '5 seconds' then raise exception 'AI limit reached'; end if;
 insert into public.site_ai_usage(day,user_id,requests,web_requests,last_request) values(today,uid,1,case when with_web then 1 else 0 end,now())
 on conflict(day,user_id) do update set requests=site_ai_usage.requests+1,web_requests=site_ai_usage.web_requests+case when with_web then 1 else 0 end,last_request=now();
end;
$$;
revoke all on function public.consume_site_ai_quota(boolean) from public,anon;
grant execute on function public.consume_site_ai_quota(boolean) to authenticated;
notify pgrst,'reload schema';
commit;
