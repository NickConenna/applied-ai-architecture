-- One welcome email per paid checkout. Server-only: RLS on, no policies.
create table if not exists public.welcome_emails (
  session_id text primary key,
  email      text not null,
  sent_at    timestamptz not null default now()
);
alter table public.welcome_emails enable row level security;
