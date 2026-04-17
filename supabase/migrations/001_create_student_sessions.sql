-- Run this in your Supabase project: SQL Editor → New query → paste & run

create table if not exists public.student_sessions (
  id           uuid primary key default gen_random_uuid(),
  student_name text        not null,
  topic        text        not null,
  level        text        not null,
  is_correct   boolean     not null,
  wrong_step   integer,
  explanation  text        not null default '',
  created_at   timestamptz not null default now()
);

-- Index makes dashboard queries fast once there are many rows
create index if not exists student_sessions_student_name_idx
  on public.student_sessions (student_name);

-- Allow the anon key to read and insert (RLS off for now — tighten later)
alter table public.student_sessions enable row level security;

create policy "anon can insert"
  on public.student_sessions for insert
  to anon
  with check (true);

create policy "anon can select"
  on public.student_sessions for select
  to anon
  using (true);
