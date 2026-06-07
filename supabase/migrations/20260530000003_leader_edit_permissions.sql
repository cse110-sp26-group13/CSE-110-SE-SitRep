-- Migration: Allow Group Leaders to Edit Group Events
-- Date: 2026-05-30

-- 1. Update calendar_events UPDATE policy
drop policy if exists "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events
  for update using (
    owner_id = auth.uid() -- Owner can edit
    or exists (
      -- Group Leader can edit events in their group
      select 1 from public.calendar_groups g
      where g.id::text = calendar_events.group
        and g.creator_id = auth.uid()
    )
  );

-- 2. Update calendar_events DELETE policy
drop policy if exists "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events
  for delete using (
    owner_id = auth.uid() -- Owner can delete
    or exists (
      -- Group Leader can delete events in their group
      select 1 from public.calendar_groups g
      where g.id::text = calendar_events.group
        and g.creator_id = auth.uid()
    )
  );
