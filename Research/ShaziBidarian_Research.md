# Shazi's Research

Looking at three apps the team already uses day-to-day (Notion, Slack) plus an idea for our own personal dashboard.

## Notion

Not gonna lean on Notion too hard — most of what it does isn't that helpful for a daily-standup tool. The useful bits:

- to-do lists / checkboxes — simple, low friction, good for short-lived items
- pages-as-dashboards — each person gets their own page they can shape however they want. Worth borrowing the *idea* but not the heavyweight DB stuff
- inline blocks (callouts, toggles) — nice for "today's focus" or collapsible "yesterday/today/blockers"
- templates — Notion's biggest UX move is that people don't start from a blank page. We should ship a default personal-dashboard layout, not an empty box

What we should *skip*: relational databases, multi-view (table/board/calendar) toggles, permissions/sharing. Way too heavy for a SitRep tool — Notion is what people use when they've outgrown a standup app, not before.

## Personal dashboard (the sticky note idea)

Thinking each user gets a personal page on top of the team dashboard. The core feature is a **sticky note / scratch pad** for jotting things down that aren't formal standup material — half-thoughts, links to look at later, "remind me to ask X about Y."

Things to research and steal from:

- **Apple Notes / Stickies** — single-textarea, no formatting overhead, autosave. The "no friction" model is the whole point. If we ask people to pick a tag or category before writing, they won't write.
- **bullet journaling** — common personal-tracker pattern: today's focus, parking lot, gratitude/mood. Most of these are one-liner prompts, not paragraphs.
- **Linear "My Issues" / GitHub assigned-to-me** — personal view filtered out of the team firehose. Useful pattern: same data, scoped to me.
- **Obsidian daily notes** — auto-creates a dated note each day. Could do the same: each day's sticky-note state is auto-snapshotted so people can scroll back through their own week.

Open questions:
- Sticky note: persistent across days, or one-per-day with history?
- Does it stay private, or can teammates optionally peek? (Probably private by default — "scratch pad" people will self-censor otherwise.)
- Markdown support, or plain text only? Plain text is probably the right call for v1 — keeps it fast.

Templates worth offering as starter sticky-note content:
1. **Daily focus** — top 3 items for today
2. **Parking lot** — questions/ideas to bring up later
3. **Personal blockers** — stuff that's not team-visible-yet
4. **End-of-day reflection** — what went well, what didn't

## Slack

What works in Slack's UX that we should borrow:

- **Left sidebar for nav between pages** — channels list pattern. Persistent, always visible, one click to switch contexts. We should do the same for switching between team view / personal view / blockers / calendar.
- **DMs** — direct 1:1 channels separate from group chat. For us this might map to "cover-for-me" requests or pinging a specific teammate when they're blocking you, without spamming the team channel.
- **Statuses** (the little emoji + text next to your name) — lightweight async signaling. "in a meeting," "heads-down," "out sick" without writing a full standup. Cheap to set, immediately visible to everyone.
- **Do-not-disturb / snooze** — explicit "leave me alone" signal. Important for the burnout/cover-needed angle of our product.
- **Threads** — keep replies attached to the original message instead of polluting the main feed. If we let people comment on each other's check-ins, threading keeps the dashboard scannable.
- **Unread indicators** — bold-text / dot on the sidebar item. People know at a glance what's new since they last looked.

What *not* to copy:
- Notification overload — Slack's biggest UX failure. We should default to fewer pings, more digest-style summaries.
- Channel sprawl — don't ship "create your own channel" UI. Fixed views only.

## Cross-cutting takeaways

- **Sidebar nav, left-rail style** (Slack/Linear/Notion all do this) is the pattern for our app shell — already started in [index.html](../index.html).
- **Personal vs. team views** matter a lot — every app that gets standup right has a "my stuff" filter.
- **Low-friction inputs win** — sticky notes, status emojis, one-click check-ins beat structured forms every time.
- **Templates beat blank pages** — pre-fill defaults; don't make the user design their own dashboard from zero.
