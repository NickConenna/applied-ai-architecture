-- Customer file: Claude's running profile of each member, shared by the AI partner,
-- the member page, and the admin page. Written only by the refresh-profile function.
-- Run AFTER 20261007_addon_briefs.sql. Safe to run more than once.
create table if not exists public.customer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  summary    text not null default '',
  facts      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
drop policy if exists "own profile read"   on public.customer_profiles;
drop policy if exists "admin profile read" on public.customer_profiles;
create policy "own profile read"   on public.customer_profiles for select to authenticated using (auth.uid() = user_id);
create policy "admin profile read" on public.customer_profiles for select to authenticated using (public.is_admin());
