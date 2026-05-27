**HardCoders**  
**Team 13 review of Team 12’s project repo**  
**Strengths:**

- The team effectively uses GitHub Issues to track their development workflow. Each issue clearly documents both the problem being addressed and the intended goal, making it easy to understand the purpose and outcome of every change. Additionally, the repository is well-organized with a clean structure that separates concerns logically.  
- Looking through their issues, each one includes a clear description of what was broken or needed, what the fix or feature aimed to accomplish, and how it was resolved, demonstrating consistent and intentional use of Issues as a communication and tracking tool.

**Improvements:**

- Currently, the store holds data only in memory. All entries are lost on page refresh. The simplest fix would be to integrate localStorage directly into createStandupStore(), loading saved data on initialization and persisting updates using the existing serialize() logic.  
- To keep the Node.js test suite working, the storage object could be injected as a parameter with localStorage as the default. Tests would then simply pass in a mock object instead, requiring minimal changes to the existing test setup.

**Unclear/Question**

- Opening the repository for the first time, it was difficult to understand what the project actually is or where it currently stands. The README offers almost no context. There was a video, but documentation is important as well. Also, the lack of meeting notes made it hard to follow how the project has been progressing week to week without them, there is no way to understand the reasoning behind decisions or what the team has been working on.

**Suggestions:**

- The first thing we think is a proper README. Right now, it tells you how to install dependencies, but doesn't explain what the app actually is, why there's no runnable UI, or how the docs/ folder relates to the source code.  
- The single change would be adding three things: a one-sentence description of what the app does, a "Current Status" section clarifying that Phase 1 is intentionally just the data layer with no UI yet, and a brief project structure overview distinguishing reference material from active code. That alone would eliminate most of the confusion a new developer runs into in the first 10 minutes.


