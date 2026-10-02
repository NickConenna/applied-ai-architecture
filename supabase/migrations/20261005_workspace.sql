-- Workspace: step progress, members reading their own AI history, and a private
-- files area (Nick's deliverables + drafts members save from their AI partner).
-- Run AFTER 20261004_admin_activity.sql. Safe to run more than once.

-- 1. Step progress: one row per step a member marks done.
create table if not exists public.step_progress (
  user_id   uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  done_at   timestamptz not null default now(),
  primary key (user_id, module_id)
);
alter table public.step_progress enable row level security;
drop policy if exists "own progress read"   on public.step_progress;
drop policy if exists "own progress insert" on public.step_progress;
drop policy if exists "own progress delete" on public.step_progress;
drop policy if exists "admin progress read" on public.step_progress;
create policy "own progress read"   on public.step_progress for select to authenticated using (auth.uid() = user_id);
create policy "own progress insert" on public.step_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "own progress delete" on public.step_progress for delete to authenticated using (auth.uid() = user_id);
create policy "admin progress read" on public.step_progress for select to authenticated using (public.is_admin());

-- 2. Members can read their own AI partner history (the server still does all writes).
alter table public.ai_messages enable row level security;
drop policy if exists "own ai history read" on public.ai_messages;
create policy "own ai history read" on public.ai_messages for select to authenticated using (auth.uid() = user_id);

-- 3. Files and drafts.
create table if not exists public.member_files (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  kind         text not null check (kind in ('file', 'draft')),
  storage_path text,                 -- for kind = 'file'
  body         text,                 -- for kind = 'draft'
  created_by   text not null check (created_by in ('nick', 'member', 'ai')),
  created_at   timestamptz not null default now()
);
create index if not exists member_files_user on public.member_files (user_id, created_at desc);
alter table public.member_files enable row level security;
drop policy if exists "own files read"     on public.member_files;
drop policy if exists "own drafts insert"  on public.member_files;
drop policy if exists "own drafts delete"  on public.member_files;
drop policy if exists "admin files all"    on public.member_files;
create policy "own files read"    on public.member_files for select to authenticated using (auth.uid() = user_id);
create policy "own drafts insert" on public.member_files for insert to authenticated
  with check (auth.uid() = user_id and kind = 'draft' and created_by in ('member', 'ai') and storage_path is null);
create policy "own drafts delete" on public.member_files for delete to authenticated
  using (auth.uid() = user_id and kind = 'draft');
create policy "admin files all"   on public.member_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Private storage bucket. Files live under <member user id>/<file>.
insert into storage.buckets (id, name, public) values ('member-files', 'member-files', false)
on conflict (id) do nothing;
drop policy if exists "member reads own files" on storage.objects;
drop policy if exists "admin manages member files" on storage.objects;
create policy "member reads own files" on storage.objects for select to authenticated
  using (bucket_id = 'member-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin manages member files" on storage.objects for all to authenticated
  using (bucket_id = 'member-files' and public.is_admin())
  with check (bucket_id = 'member-files' and public.is_admin());

-- 4. Admin list gains progress and file counts.
drop function if exists public.admin_members();
create function public.admin_members()
returns table (
  user_id uuid, email text, business_name text, track text, location text,
  stage text, goal text, about text, has_baseline boolean,
  baseline_updated timestamptz, note text, kits text[],
  joined_at timestamptz, last_active timestamptz, steps_done int, files int
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
                    (select max(s.done_at) from public.step_progress s where s.user_id = u.id)),
           (select count(*)::int from public.step_progress s where s.user_id = u.id),
           (select count(*)::int from public.member_files f where f.user_id = u.id)
    from auth.users u
    left join public.intake i on i.user_id = u.id
    left join public.baselines b on b.user_id = u.id
    left join public.baseline_notes n on n.user_id = u.id
    where exists (select 1 from public.purchases p where lower(p.email) = lower(u.email) and p.active)
    order by coalesce(b.updated_at, u.created_at) desc;
end $$;
revoke all on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;
