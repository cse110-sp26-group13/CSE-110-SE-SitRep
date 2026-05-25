# Jeong Min Park

#### Status Tracking App?

- Status Tracking app is a tool designed to provide **real-time visibility into a team’s health and progress.**
- “How is it going right now?”
- **Goal:** It aims to replace or supplement the "Daily Stand-up" by **making information transparent**, **reducing the need** for constant "status update" meetings.

#### Essential Features (Industry Standard)

1. **Asynchronous Check-ins (The "Daily Stand-up" Replacement)**
    
    : A system where team members can report their status without needing everyone in a meeting at the same time.
    
    - What did you do yesterday?
    - What are you doing today?
    - Are there any blockers?
2. **Blocker & Impediment Visibility**
    
    : A high-priority indicator for anything stopping work
    
    **Requirement**: It shouldn't just be a "Status: In Progress" tag. There must be a specific **"Blocked"** or **"Needs Help"** state that alerts the team immediately to prevent delays.
    
3. **Team Sentiment & Health (The "Feeling" Metric)**
    - Tracking the human element of the team
    - Features like "Mood check-ins" or "Burnout indicators." As your prompt asks, *"Are we feeling bad?"* the app should capture if a team member is overwhelmed or needs a break.
4. **Aggregated Dashboard (The "SitRep")**
    
    : A single source of truth for the entire team
    
    - A view that summarizes the whole team's status at a glance, so a lead can see the "Situation Report" (SitRep) without clicking through every individual task.

### Platform Research

#### 1. RANGE (range.co)

What was special?

- Use with slack/ google (docs, calender, etc.)
    
    ⇒ I think this was what we were aiming to,
    
- Check-ins: Tracking feelings (with color)
    
    ![스크린샷 2026-05-06 오후 8.36.09.png](Jeong%20Min%20Park/%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2026-05-06_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_8.36.09.png)
    
    [https://www.range.co/product/check-ins](https://www.range.co/product/check-ins)
    
- Goals:
    - Can set private or public(team)
    - And can manage it by tags
        - Team can use these tags to show they are working for this goal by tagging
- Meetings: manage it with Agenda
    
    ![스크린샷 2026-05-06 오후 8.41.17.png](Jeong%20Min%20Park/%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2026-05-06_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_8.41.17.png)
    
    - Document notes, and automatically share takeaways through slack/ gmail

#### 2. Geekbot (geekbot.com)

This had a good example using AI in their status tracking 

- Use with slack/ google (docs, calender, etc.)

What was special:

- Bot-driven Async:
    - This is not an app that can be used solo, but it can sync with slack and the bot DM’s to people
    - Have to see how it works!
    - The bot can manage time when to ask (good for teammates who are other side of the world)
- Tracks “Team Happiness”
    - from each DM the bot had with teammates, it sorts out the feeling into “happy, neutral, unhappy”
    - Happiness Graph: can show weekly graph of team’s feelings.
- Can track Blocker
    - If the bock detects blocker, it makes a Blocker tag and push it to the dashboard