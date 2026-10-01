-- Instant delivery: each paid checkout can be traded for a sign-in exactly once.
-- Only the claim-order function (service role) touches this table; RLS on with no policies
-- means the browser can't read or write it.
create table if not exists public.checkout_claims (
  session_id text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.checkout_claims enable row level security;

-- Lets the server match a paying email to its account so intake can be prefilled.
-- Callable by the service role only; nobody in a browser can look up users.
create or replace function public.user_id_by_email(e text)
returns uuid language sql stable security definer set search_path = auth, public as $$
  select id from auth.users where lower(email) = lower(e) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
