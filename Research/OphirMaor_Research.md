## Status Tracking App Research

### What is a Status Tracking App?

A status tracking app is a tool that helps a team understand what everyone is working on, what progress has been made, and what problems are slowing people down. Instead of relying only on daily stand-up meetings, the app lets people give updates asynchronously. This is especially useful for remote teams, busy teams, or teams where people are working at different times.

The main purpose is not just to ask, “What did everyone do?” The more important question is, “Is the team moving forward, and does anyone need help?” A good status tracking app should make progress, blockers, and team health easy to see without needing a meeting every day.

### Why This Type of App is Useful

In a normal stand-up meeting, everyone usually answers:

- What did I do yesterday?
- What am I doing today?
- Do I have any blockers?

This works in theory, but in real life, stand-ups can become repetitive status reports. People may say what they worked on, but blockers might not actually get solved during the meeting. Some developers also point out that stand-ups often become more about reporting to a manager than helping teammates unblock each other.

A status tracking app can improve this by making updates easier to record, easier to review, and easier to organize. It also creates a history, so the team can look back and see patterns over time.

### Important Features

#### 1. Asynchronous Updates

The most important feature is asynchronous check-ins. This means teammates do not all have to meet at the same time. Instead, each person can submit their update when it works for them.

This is useful because:

- it saves meeting time
- it works better across time zones
- people can write clearer updates
- the team has a written record
- updates can be reviewed later

For example, ScrumGenius is built around automated async stand-ups and supports Slack, Microsoft Teams, and email. It also mentions timezone-based sends, which is useful because not every team member may be working at the same time.

#### 2. Blocker Tracking

A status app should make blockers very obvious. If someone is stuck, that should not be hidden inside a long paragraph. There should be a clear “Blocked” or “Needs Help” option.

This matters because blockers are one of the main reasons teams have stand-ups in the first place. If the app only collects updates but does not highlight problems, then it is not much better than a regular form.

A useful blocker feature could include:

- a red or high-priority blocker tag
- a list of unresolved blockers
- how long each blocker has been open
- who may be able to help
- automatic alerts to the team or team lead

ScrumGenius specifically mentions goal and blocker tracking, along with visualizing common blockers and team engagement.

#### 3. Custom Questions

Not every team needs the exact same stand-up questions. A software team, design team, or business team may all want different check-ins.

Jell has a good example of this because it allows teams to customize their stand-up questions. It supports different answer formats, like text, list, multiple choice, or number responses. This is useful because the app can match the team’s actual workflow instead of forcing everyone into one format.

For our app, this could mean the team lead can create questions like:

- What task did you finish?
- What are you currently working on?
- Are you blocked?
- How confident are you about finishing your task?
- Do you need feedback from anyone?

#### 4. Team Health / Mood Tracking

A good status tracker should not only track tasks. It should also track how the team is feeling. Someone may not be blocked technically, but they could still be stressed, confused, or overloaded.

This is useful because a project can look fine on paper while the team is actually struggling. A mood check-in can help catch problems earlier.

Possible mood tracking features:

- simple emoji check-in
- stress level from 1–5
- “feeling good / okay / overwhelmed”
- optional private note to the team lead
- weekly team mood trend

This should be simple, because if it feels too personal or too long, people may not answer honestly.

#### 5. Dashboard / Team Overview

The dashboard is probably the most important part of the app. The team lead should not have to read every single update one by one just to understand what is happening. The dashboard should summarize the team’s current situation.

A good dashboard could show:

- who submitted an update
- who has not checked in yet
- current blockers
- tasks at risk
- overall team mood
- progress by goal or project
- recent changes since the last update

The dashboard should be more than just a list. It should help answer, “What needs attention right now?”

#### 6. Integrations

A status tracking app becomes more useful if it connects to tools the team already uses. If people have to open a completely separate app every day, they may forget or stop using it.

Useful integrations could include:

- Slack
- Discord
- Microsoft Teams
- Google Calendar
- GitHub
- Jira
- Trello
- email

ScrumGenius is a strong example here because it works with Slack, Microsoft Teams, email, GitHub, Jira, Asana, Azure DevOps, and other tools.

For our project, even a simple Slack or Discord integration would make the app feel more realistic because the reminder could go directly to where the team already communicates.

### Platform Research

#### 1. Jell

Jell is a status tracking and daily stand-up tool. What stood out to me is that it focuses on flexibility. It lets teams set their own schedule and customize the questions they ask. This is important because different teams may not want the same daily stand-up format every time.

What was special:

- **Custom schedules**
    - Teams can choose which days check-ins happen.
    - This is good for teams that do not need a full stand-up every single day.

- **Custom questions**
    - Teams can write their own questions.
    - They can also choose different response types, like text, lists, multiple choice, or numbers.

- **Remote-team friendly**
    - Jell is designed for remote teams and teams across different time zones.
    - This connects well to the idea of replacing live meetings with async updates.

What we can learn from it:

- Our app should not force only one check-in format.
- It would be useful to let teams customize the questions depending on their project.
- The check-in process should be quick and flexible.

#### 2. ScrumGenius

ScrumGenius is another async stand-up tool. It is focused on automating stand-ups, surveys, meetings, and reports. It works inside tools like Slack, Microsoft Teams, and email, which makes it easier for people to respond without opening a separate app.

What was special:

- **Works across multiple platforms**
    - Slack
    - Microsoft Teams
    - Email
    - Cisco Webex Teams

- **Goal and blocker tracking**
    - It does not only collect updates.
    - It also helps teams track goals and blockers.

- **Automated reports**
    - ScrumGenius can create summary reports, which reduces the need for someone to manually collect everyone’s updates.

- **Timezone support**
    - It can send check-ins based on timezone.
    - This is useful for remote or international teams.

What we can learn from it:

- The app should fit into the team’s existing workflow.
- Blockers should be tracked separately from normal updates.
- Automated summaries would make the app much more useful.

#### 3. Status Hero

Status Hero is another example of a status tracking app that focuses on check-ins, goals, and team alignment. The idea is that team members submit quick updates, and the app turns those updates into a shared team view. This is useful because the team can see progress without needing to constantly ask each other for updates.

What was special:

- **Check-ins connected to goals**
    - Updates are more useful when they are connected to actual team goals.
    - This prevents the app from becoming just a list of random tasks.

- **Team visibility**
    - Everyone can see what others are working on.
    - This helps prevent duplicate work and confusion.

- **Progress history**
    - Since updates are saved, the team can look back at what happened earlier.

What we can learn from it:

- Our app should connect daily updates to larger goals.
- It should show progress over time, not just today’s update.
- The app should make it easy to understand what changed from one day to the next.

### Problems to Avoid

#### 1. Updates Becoming Too Vague

One risk with async updates is that people may write very short or low-effort answers. For example, someone might just write “working on backend” or “same as yesterday.” That does not really help the team.

To prevent this, the app could ask more specific questions or require a blocker field. It could also show examples of good updates.

#### 2. Blockers Being Ignored

Async stand-ups only work if people actually read the updates and respond. Some people have said that async updates can fail when blockers are written down but nobody follows up on them.

So the app should not just record blockers. It should keep them visible until they are resolved.

#### 3. Too Many Notifications

If the app sends too many reminders or alerts, people may start ignoring it. Notifications should be used carefully.

Good notifications:

- reminder to submit check-in
- blocker alert
- someone asks for help
- weekly summary

Bad notifications:

- every small update
- repeated reminders
- unnecessary dashboard changes

#### 4. Replacing Communication Completely

A status app should reduce unnecessary meetings, but it should not replace all communication. Some issues still need a real conversation. The app should help the team decide when a meeting is actually needed.

For example, if a blocker has been open for multiple days, the app could suggest a quick follow-up discussion.

### My Main Takeaways

After researching status tracking apps, I think the best version should be simple, fast, and focused on visibility. The goal should not be to create more work for the team. The goal should be to make important information easier to find.

The most important features for our app would be:

1. **Async check-ins**
2. **Clear blocker tracking**
3. **Team mood or health tracking**
4. **A dashboard that summarizes the whole team**
5. **Custom questions**
6. **Slack/Discord or email reminders**
7. **History over time**
8. **Automatic summaries**

The biggest takeaway is that a status tracking app should not just copy a daily stand-up into written form. It should improve the stand-up by making blockers easier to see, helping teammates stay aligned, and showing the team’s health in a clear way. If the app only asks “what did you do yesterday and today,” it may not be that useful. But if it helps the team notice problems earlier and respond faster, then it becomes much more valuable.
