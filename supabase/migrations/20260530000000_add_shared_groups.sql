-- Migration: Add Shared Calendar Groups
-- Date: 2026-05-30

-- 1. Create calendar_groups table
create table if not exists public.calendar_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  members uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists calendar_groups_team_idx on public.calendar_groups (team_id);

-- 2. Enable RLS
alter table public.calendar_groups enable row level security;

-- 3. RLS Policies for calendar_groups
drop policy if exists "calendar_groups_read" on public.calendar_groups;
create policy "calendar_groups_read" on public.calendar_groups
  for select using (
    creator_id = auth.uid()
    or auth.uid() = any(members)
  );

drop policy if exists "calendar_groups_insert" on public.calendar_groups;
create policy "calendar_groups_insert" on public.calendar_groups
  for insert with check (
    team_id in (select public.current_user_team_ids())
    and creator_id = auth.uid()
  );

drop policy if exists "calendar_groups_update" on public.calendar_groups;
create policy "calendar_groups_update" on public.calendar_groups
  for update using (
    creator_id = auth.uid()
    or auth.uid() = any(members)
  );

drop policy if exists "calendar_groups_delete" on public.calendar_groups;
create policy "calendar_groups_delete" on public.calendar_groups
  for delete using (creator_id = auth.uid());

-- 4. Update calendar_events_read policy to account for group membership
drop policy if exists "calendar_events_read" on public.calendar_events;
create policy "calendar_events_read" on public.calendar_events
  for select using (
    (team_id is null and owner_id = auth.uid())
    or 
    (
      team_id in (select public.current_user_team_ids())
      and (
        "group" = 'global'
        or owner_id = auth.uid()
        or exists (
          select 1 from public.calendar_groups g
          where g.id::text = calendar_events.group
            and (g.creator_id = auth.uid() or auth.uid() = any(g.members))
        )
      )
    )
  );
