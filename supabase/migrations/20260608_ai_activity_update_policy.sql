-- Migration: add UPDATE policy for ai_activity
-- Without this, edits via the session dialog are silently blocked by RLS.
-- Users may only update rows they themselves inserted (user_id = auth.uid()).

CREATE POLICY "ai_activity_update_own"
  ON ai_activity
  FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
