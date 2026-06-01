# CSE 110 Group 14 Review of Group 13

## Repository Setup

This repository is well organized and it is easy to see that this team has spent a lot of time on the project process. The sprint planning logs include the clear goals, the feature ownership, a definition of what is done, and etc. This helps the reader to understand what the team has planned to do and what problems they were thinking about. This team also has nine standup notes from May 5 to May 25, and the ADR files have followed the format required in the grading rubric. This successfully connects the decisions back to the team discussions.

## Source file / Main Content

One thing for this part could be better is the JSDoc coverage. Right now, only some of the files seems to have the JSDoc blocks, such as auth.js, but other files and functions such as the blockers.js do not seem to have the same amount of the comments. Since the documentation of the code is the part of the grading rubric, I would suggest that adding more comments to the rest of the js files would be helpful and make the code easier to read and debug later.

## Documentation

One thing for this part is that I think maybe the standup meeting schedule could also be improved. The Week7 sprint plan says that the team is taking about two standups meetings per week, but the project asks us to have at least 3 standup meetings a week. Hence, I think regarding the rubric, we should have more sprint standup meetings per week, one note is that maybe having a fixed schedule like Tuesday and Thursday after class would be helpful, and make the sprint meeting easier to access, rather than schedule another time just for the meeting.

## CI/CD Pipeline

I think for this part, you guys have done a really good job! The CI/CD setup looks really good, in your repo you are using the lint, unit and E2E testing to connect to the Github Action and deployment. I really like your idea of using the E2E test as smoke tests, it really makes sense because the features are still changing. The changelogs are really easy to read, good job! However, there is a small issue with release tags, the changelog in your repo has lists v0.1.0, v0.1.1 and v0.2.0. But there is no v0.2.0 tag in your github releases. Since the changelog is already clear, adding the missing tag would make the git history match the changelog better!

## Summary of Area of Improvements

Overall, this repo is in a good shape, the team have clear planning documentations, nice ADRs, standup notes and a clean changelog. I think the main things to improve will be adding more JSDoc comments, meeting the three standup meetings per week requirements on the grading rubric, and also please add the missing release tags. I believe these grounded changes would make the project more complete and hit the rubric better!
