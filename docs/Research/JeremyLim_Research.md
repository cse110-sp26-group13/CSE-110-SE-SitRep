# Jeremy Lim Research

Looking at a few features that fit our SE SitRep MVP without making the project too large.

## Daily Digest / Standup Summary

I think a daily digest would be useful because our app already focuses on standups, blockers, mood, and recent activity. Instead of reading every update one by one, the dashboard could show a short summary of who checked in, what people are working on, and whether anyone is blocked.

Examples:

- Range / Geekbot style async check-ins
- Slack-style daily summaries
- Our current activity feed in `js/features/activity.js`

For our MVP, this connects to the daily standup feature from the Week 7 sprint plan. A simple v1 could be a "Today at a glance" section with checked-in count, blocker count, and a few newest updates.

## Issue-to-Calendar Timeline

The MVP connects the GitHub issues tracker with the calendar. The sprint plan says issues should have start dates and due dates, and the calendar should display those dates.

Examples:

- GitHub Issues milestones
- Trello / Asana calendar views
- Linear's lightweight issue tracking

For our app, this would help teammates see deadlines without opening a separate tool. A v1 could use hard-coded issue dates in `data.js`, then later a v2 could pull real issues from GitHub.

## Lightweight Onboarding

Onboarding is already one of the four MVP features: account creation, login, and a splash page. I think it should stay simple and only ask for what the dashboard needs, like name, team/project, role, and maybe preferred standup time.

Examples:

- Notion templates so users do not start from a blank page
- Slack workspace setup
- Range / Status Hero check-in setup

For our MVP, mock login with localStorage is enough. Later, this can connect to Supabase for real accounts and team membership.

## Takeaways

- The best features reuse what we already have: check-ins, blockers, mood, activity, and meeting availability.
- Week 7 should focus on the four MVP features instead of adding unrelated tools.
- Mock data is fine for v1, and real integrations can come later.
