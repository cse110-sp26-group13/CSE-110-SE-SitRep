-- Migration: add ai_activity table
-- Sprint: agent_tracking feature branch
-- Adds first-class AI agent session tracking to SE SitRep.
-- Each row represents one logged AI tool interaction by a team member.

CREATE TABLE IF NOT EXISTS ai_activity (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  agent_name   text        NOT NULL,           -- e.g. 'claude-code', 'copilot', 'cursor'
  model        text,                           -- e.g. 'claude-sonnet-4-6', 'gpt-4o'
  task_desc    text        NOT NULL,           -- what the user asked the agent to do
  tokens_used  integer     CHECK (tokens_used >= 0),
  cost_usd     numeric(10, 6) CHECK (cost_usd >= 0),
  was_reviewed boolean     NOT NULL DEFAULT false,
  pr_link      text,                           -- optional URL to PR or commit
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for common query patterns: team's sessions by date
CREATE INDEX IF NOT EXISTS ai_activity_team_date
  ON ai_activity (team_id, date DESC);

-- Row-Level Security: a user can see/mutate sessions for any team they
-- belong to. Uses current_user_team_ids() (defined in the strict-privacy
-- migration) so multi-circle members aren't limited to one arbitrary team —
-- the earlier `LIMIT 1` subquery silently hid activity for every team but one.
ALTER TABLE ai_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_activity_team_isolation" ON ai_activity;
CREATE POLICY "ai_activity_team_isolation"
  ON ai_activity
  FOR ALL
  USING (team_id IN (SELECT public.current_user_team_ids()));

-- Allow authenticated users to insert their own sessions
DROP POLICY IF EXISTS "ai_activity_insert_own" ON ai_activity;
CREATE POLICY "ai_activity_insert_own"
  ON ai_activity
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_user_team_ids())
  );
