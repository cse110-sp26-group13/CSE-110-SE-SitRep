-- SE SitRep — add calendar events
-- Visibility: personal events (team_id is null) are private to the owner.
-- Team events (team_id set) are visible to all team members.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  end_date date,
  "group" text not null default 'personal',
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_owner_idx on public.calendar_events (owner_id);
create index if not exists calendar_events_team_idx on public.calendar_events (team_id);
create index if not exists calendar_events_date_idx on public.calendar_events (date);

alter table public.calendar_events enable row level security;

-- Users can read their own personal events AND team events they are part of.
drop policy if exists "calendar_events_read" on public.calendar_events;
create policy "calendar_events_read" on public.calendar_events
  for select using (
    (team_id is null and owner_id = auth.uid())
    or 
    (team_id in (select public.current_user_team_ids()))
  );

-- Users can insert personal events for themselves or team events for their teams.
drop policy if exists "calendar_events_insert" on public.calendar_events;
create policy "calendar_events_insert" on public.calendar_events
  for insert with check (
    (team_id is null and owner_id = auth.uid())
    or 
    (team_id in (select public.current_user_team_ids()))
  );

-- Users can update events they own OR team events for their teams.
drop policy if exists "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events
  for update using (
    owner_id = auth.uid()
    or 
    (team_id is not null and team_id in (select public.current_user_team_ids()))
  );

drop policy if exists "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events
  for delete using (
    owner_id = auth.uid()
    or 
    (team_id is not null and team_id in (select public.current_user_team_ids()))
  );
