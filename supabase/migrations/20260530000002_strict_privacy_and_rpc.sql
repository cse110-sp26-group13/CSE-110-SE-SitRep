-- Migration: Strict Group Privacy and Secure Exit
-- Date: 2026-05-30

-- 1. Tighten calendar_groups SELECT policy (Only creator or current members)
drop policy if exists "calendar_groups_read" on public.calendar_groups;
create policy "calendar_groups_read" on public.calendar_groups
  for select using (
    creator_id = auth.uid()
    or auth.uid() = any(members)
  );

-- 2. Update calendar_events SELECT policy (Membership required even for owners of group events)
drop policy if exists "calendar_events_read" on public.calendar_events;
create policy "calendar_events_read" on public.calendar_events
  for select using (
    (team_id is null and owner_id = auth.uid()) -- Personal/private
    or 
    (
      team_id in (select public.current_user_team_ids())
      and (
        "group" = 'global' -- Shared team items
        or (
          -- Group events: MUST be a current member/creator of the group to see it
          exists (
            select 1 from public.calendar_groups g
            where g.id::text = calendar_events.group
              and (g.creator_id = auth.uid() or auth.uid() = any(g.members))
          )
        )
        or (
          -- Owner can see their own 'personal' tagged items even in team context
          "group" = 'personal' and owner_id = auth.uid()
        )
      )
    )
  );

-- 3. Create a secure function to allow users to leave a group
-- This bypasses RLS update restrictions for self-removal.
create or replace function public.leave_calendar_group(group_uuid uuid)
returns void
language plpgsql
security definer -- Runs with elevated privileges to update the members array
set search_path = public
as $$
begin
  -- Verify the user is actually a member and NOT the creator
  if exists (
    select 1 from public.calendar_groups
    where id = group_uuid
      and auth.uid() = any(members)
      and creator_id != auth.uid()
  ) then
    update public.calendar_groups
    set members = array_remove(members, auth.uid())
    where id = group_uuid;
  else
    raise exception 'User is not a member or is the creator of this group.';
  end if;
end;
$$;
