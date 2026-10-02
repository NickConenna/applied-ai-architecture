-- Add-on briefs: what a member tells you after buying an add-on, plus its status.
-- Run AFTER 20261005_workspace.sql. Safe to run more than once.
create table if not exists public.addon_briefs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  addon_key  text not null,
  answers    jsonb not null default '{}',
  status     text not null default 'submitted' check (status in ('submitted', 'in_progress', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, addon_key)
);
alter table public.addon_briefs enable row level security;
drop policy if exists "own briefs read"   on public.addon_briefs;
drop policy if exists "own briefs insert" on public.addon_briefs;
drop policy if exists "own briefs update" on public.addon_briefs;
drop policy if exists "admin briefs all"  on public.addon_briefs;
create policy "own briefs read" on public.addon_briefs for select to authenticated using (auth.uid() = user_id);
-- Members can only submit briefs for add-ons they own, and can edit until you start work.
create policy "own briefs insert" on public.addon_briefs for insert to authenticated
  with check (auth.uid() = user_id and status = 'submitted'
    and exists (select 1 from public.purchases p
                where lower(p.email) = lower(auth.jwt() ->> 'email') and p.active and p.lookup_key = addon_key));
create policy "own briefs update" on public.addon_briefs for update to authenticated
  using (auth.uid() = user_id and status = 'submitted')
  with check (auth.uid() = user_id and status = 'submitted');
create policy "admin briefs all" on public.addon_briefs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin list gains a count of briefs waiting on you.
drop function if exists public.admin_members();
create function public.admin_members()
returns table (
  user_id uuid, email text, business_name text, track text, location text,
  stage text, goal text, about text, has_baseline boolean,
  baseline_updated timestamptz, note text, kits text[],
  joined_at timestamptz, last_active timestamptz, steps_done int, files int, briefs_waiting int
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
                    (select max(m.created_at) from public.ai_messages m where m.user_id = u.id),
                    (select max(s.done_at) from public.step_progress s where s.user_id = u.id),
                    (select max(a.updated_at) from public.addon_briefs a where a.user_id = u.id)),
           (select count(*)::int from public.step_progress s where s.user_id = u.id),
           (select count(*)::int from public.member_files f where f.user_id = u.id),
           (select count(*)::int from public.addon_briefs a where a.user_id = u.id and a.status = 'submitted')
    from auth.users u
    left join public.intake i on i.user_id = u.id
    left join public.baselines b on b.user_id = u.id
    left join public.baseline_notes n on n.user_id = u.id
    where exists (select 1 from public.purchases p where lower(p.email) = lower(u.email) and p.active)
    order by coalesce(b.updated_at, u.created_at) desc;
end $$;
revoke all on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

-- Point add-on steps at the in-app brief instead of "email me".
update public.kit_modules
set body = regexp_replace(body, '\*\*What I need from you:\*\*[^\n]*',
  '**What I need from you:** fill in your brief under **Your add-ons** on this page. It takes a few minutes.')
where required_key like 'addon_%' and body ~ '\*\*What I need from you:\*\*';

update public.kit_modules
set body = regexp_replace(body, '\*\*Next step:\*\* email me[^\n]*',
  '**Next step:** send your brief under **Your add-ons** on this page. I''ll reply within two business days to book your kickoff.')
where (required_key like 'build_%' or required_key like 'studio_%' or required_key like 'addon_%')
  and body ~ '\*\*Next step:\*\* email me';
