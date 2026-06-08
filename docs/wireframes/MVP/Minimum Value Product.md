# Minimum Value Product

top 4 features - week 7

1. github issues tracker - 3 or 4 (Andrew, Jeong, Ophir)
    1. 2 versions, option up to user
    2. v1
        1. built within the dashboard and our product (already mostly built)
        2. add start and end dates
    3. v2
        1. github issue api
        2. pull info from github for issues tracking
        3. sign in and connecting user githubs, picking repos, 
2. calendar - 2 (stephanie)
    1. track individual project timelines, and also team project timelines
    2. aligns with issues tracker and dates
    3. hard code issues to play w start and end dates
    4. opportunity request extensions
    5. 
    
    ![image.png](Minimum%20Value%20Product/image.png)
    
3. daily standup - (Yang)
    1. 2 things
        1. team standup
        2. adding personal standup on progress
    2. posts to everyones dashboard
    3. blockers
    4. daily mood
    5. 
    
    ![image.png](Minimum%20Value%20Product/image%201.png)
    
    ![image.png](Minimum%20Value%20Product/image%202.png)
    
4. onboarding - 1 - shazi
    1. creating an account
    2. user login
    3. splash page
5. review crew - 3 minimum (need as many as possible) - shazi, aidan, 

---

week 8

1. user tiers
    1. for visibility
    2. think about who should see what, and the different types of groups and levels
        1. business vs startup vs group project
    3. ties into other features visibility
2. user database
    1. use supabase and build out tables and users
3. ui/ux 
    1. finish prototyping the full ui
    2. light mode/dark mode
    3. theming
4. messaging feature
    1. connect to slack api
5. big focus on user experience
    1. make sure everything runs smoothly

---

1. building a very basic issues tracker
    1. create issue
    2. put a due date
    3. to do/in progress/done
    4. description box
    5. live issues for team to see
    6. cateorizing 
        1. ui/swe/backend
        2. get notifications if youre on that team
2. dashboard = landing page
    1. not customizable for now
    2. issues
    3. when 2 meet dupe
    
    ![image.png](Minimum%20Value%20Product/image%203.png)
    
- lovable features - place your initial next to the features you want to see in V1!
    
    # SE SitRep — Features Included
    
    **📊 Status Overview (top bar)**
    
    - Live "0900 hours" header with date + sprint/day counter
    - 5 at-a-glance KPIs: checked-in ratio, active blockers, team mood, humans on deck, AI agents tracked S SY
        - Live-sync indicator with pulsing dot S
    
    **👥 Team Roster (humans)**
    
    - Async standup card per member (auto-prompted at 09:00 local)
    - Yesterday / Today check-in lines
    - Status states: checked-in, blocked, off / cover needed, awaiting check-in S AT SY
    - Per-person blocker callout
    - Mood score (x/10) color-coded by health S SY
    - "Cover needed" badge + quick-message button S
    - Check-in timestamp S
    
    **🤖 AI Agents on Roster - TBD For after users features are implemented**
    
    - Agents tracked alongside humans, each with a human supervisor
    - Live status: running / blocked / idle S SY AT
    - Progress bar + % complete S
    - Runtime, API cost ($), open PR count per agent S (eventually)
    - Pause/Play controls
    - Alert banner when an agent needs human review
    - Daily spend total in header
    
    **⚠️ Active Blockers Panel**
    
    - Severity-coded list (critical / high / med) S SY
    - Owner, age, and "needs <person>" routing
    - Works for both humans and agents
    
    **❤️ Team Pulse**
    
    - 7-day mood average with trend delta P
    - Sparkline chart P
    - Breakdown: feeling great / neutral / struggling counts
    
    **📅 Meeting Finder**
    
    - "When can we meet?" today's open slots S
    - Availability bar (X / Y available) per slot S AT P SY
    - "Best" slot highlighting from calendar + focus blocks
    
    **📡 Live Activity Feed**
    
    - Unified timeline mixing humans + agents
    - Event types: check-ins, commits, PRs, blockers, cover offers, agent summaries
    - Filters: all / humans / agents / blockers
    
    **🎨 Design system**
    
    - Dark tactical theme with semantic tokens (primary green, AI purple, accent amber)
    - Radar-sweep animation, gradient surfaces, responsive grid layout
