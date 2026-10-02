-- Adds activity dates to the admin member list so quiet members can be spotted.
-- Run AFTER 20261003_admin.sql. Safe to run more than once.
alter table public.intake add column if not exists updated_at timestamptz;

drop function if exists public.admin_members();
create function public.admin_members()
returns table (
  user_id uuid, email text, business_name text, track text, location text,
  stage text, goal text, about text, has_baseline boolean,
  baseline_updated timestamptz, note text, kits text[],
  joined_at timestamptz, last_active timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select u.id, u.email::text,
           i.business_name::text, i.track::text, i.location::text,
           i.stage::text, i.goal::text, i.about::text,
           (b.user_id is not null), b.updated_at, n.note,
           (select array_agg(distinct p.lookup_key::text) from public.purchases p
             where lower(p.email) = lower(u.email) and p.active),
           (select min(p.created_at) from public.purchases p where lower(p.email) = lower(u.email) and p.active),
           greatest(u.last_sign_in_at, i.updated_at, b.updated_at,
                    (select max(m.created_at) from public.ai_messages m where m.user_id = u.id))
    from auth.users u
    left join public.intake i on i.user_id = u.id
    left join public.baselines b on b.user_id = u.id
    left join public.baseline_notes n on n.user_id = u.id
    where exists (select 1 from public.purchases p where lower(p.email) = lower(u.email) and p.active)
    order by coalesce(b.updated_at, u.created_at) desc;
end $$;
revoke all on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;
