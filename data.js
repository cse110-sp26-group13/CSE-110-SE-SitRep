/**
 * MOCK DATASET
 * Used as a fallback for Supabase persistence during local development.
 */

const team = {
  name: "Sprint status",
  currentUserId: "alex",
};

const teammates = [
  {
    id: "alex",
    name: "Alex Kim",
    role: "Frontend",
    mood: 8,
    moodHistory: [6, 7, 7, 8, 9, 7, 8],
    avatar: "https://ui-avatars.com/api/?name=Alex+Kim&background=4f46e5&color=fff",
    lastCheckIn: {
      time: "9:42 AM",
      yesterday: "Wired up dashboard skeleton",
      today: "KPI strip + mood pills",
      blockers: "",
    },
    coverNeeded: false,
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    role: "Backend",
    mood: 4,
    moodHistory: [7, 6, 5, 5, 4, 4, 4],
    avatar: "https://ui-avatars.com/api/?name=Jordan+Lee&background=0891b2&color=fff",
    lastCheckIn: {
      time: "8:15 AM",
      yesterday: "Auth refactor PR",
      today: "Out sick — won't get to API reviews",
      blockers: "Auth tokens expiring mid-session in staging",
    },
    coverNeeded: true,
    coverNote: "Out sick — can someone take API review and on-call?",
  },
  {
    id: "sam",
    name: "Sam Patel",
    role: "Design",
    mood: 7,
    moodHistory: [8, 8, 7, 7, 8, 7, 7],
    avatar: "https://ui-avatars.com/api/?name=Sam+Patel&background=059669&color=fff",
    lastCheckIn: {
      time: "10:01 AM",
      yesterday: "Empty-state illustrations",
      today: "Design review with PM at 2pm",
      blockers: "Waiting on Figma access for Taylor",
    },
    coverNeeded: false,
  },
  {
    id: "riley",
    name: "Riley Chen",
    role: "PM",
    mood: 9,
    moodHistory: [8, 9, 9, 8, 9, 9, 9],
    avatar: "https://ui-avatars.com/api/?name=Riley+Chen&background=f59e0b&color=fff",
    lastCheckIn: {
      time: "9:55 AM",
      yesterday: "Sprint planning prep",
      today: "Stakeholder demo at 3pm",
      blockers: "",
    },
    coverNeeded: false,
  },
  {
    id: "taylor",
    name: "Taylor Brooks",
    role: "QA",
    mood: null,
    moodHistory: [7, 7, 6, 7, 7, 6, null],
    avatar: "https://ui-avatars.com/api/?name=Taylor+Brooks&background=7c3aed&color=fff",
    lastCheckIn: null,
    coverNeeded: false,
  },
];

const blockers = [
  {
    id: "b1",
    title: "Auth tokens expiring mid-session in staging",
    description: "Tokens are expiring ~15 minutes after issuance on staging only. Repro: log in, idle 15 min, hit any /api endpoint → 401. Prod is fine. Suspect the refresh-token rotation patch from last week.",
    severity: "critical",
    status: "open",
    ownerId: "jordan",
    owner: "Jordan Lee",
    postedAt: "8:20 AM",
    startDate: "2026-05-10",
    dueDate: "2026-05-20",
    category: "backend",
    comments: [
      { id: "c1-1", who: "Alex Kim", text: "Saw this too — reproduced on my account. Happy to pair this afternoon.", time: "9:05 AM" },
    ],
  },
  {
    id: "b2",
    title: "Stale data in staging env",
    description: "Staging DB hasn't been refreshed since last Tuesday. QA can't validate the new onboarding flow against realistic data.",
    severity: "high",
    status: "in-progress",
    ownerId: "riley",
    owner: "Riley Chen",
    postedAt: "Yesterday 4:12 PM",
    startDate: "2026-05-08",
    dueDate: "2026-05-15",
    category: "backend",
    comments: [],
  },
  {
    id: "b3",
    title: "Dashboard build failing on Windows",
    description: "`npm run build` fails on Windows with a path-separator error in the asset pipeline. Mac and Linux are fine.",
    severity: "high",
    status: "open",
    ownerId: "alex",
    owner: "Alex Kim",
    postedAt: "Yesterday 1:30 PM",
    startDate: "2026-05-09",
    dueDate: "2026-05-16",
    category: "swe",
    comments: [],
  },
  {
    id: "b4",
    title: "Figma file access for new hire",
    description: "Taylor needs edit access to the onboarding Figma file to pick up QA tasks.",
    severity: "medium",
    status: "open",
    ownerId: "sam",
    owner: "Sam Patel",
    postedAt: "9:50 AM",
    startDate: "2026-05-14",
    dueDate: "2026-05-17",
    category: "ui",
    comments: [],
  },
];

/**
 * PROJECT TIMELINES
 * Array of team and individual projects rendered in the Calendar feature.
 */
const projects = [];

const meetingSlots = [
  {
    id: "s1",
    time: "11:00",
    label: "11:00 – 11:30 AM",
    availability: { alex: true, jordan: false, sam: true, riley: true, taylor: true },
  },
  {
    id: "s2",
    time: "1:30",
    label: "1:30 – 2:00 PM",
    availability: { alex: true, jordan: true, sam: true, riley: true, taylor: true },
  },
  {
    id: "s3",
    time: "3:00",
    label: "3:00 – 3:30 PM",
    availability: { alex: false, jordan: true, sam: false, riley: true, taylor: true },
  },
  {
    id: "s4",
    time: "4:30",
    label: "4:30 – 5:00 PM",
    availability: { alex: true, jordan: true, sam: true, riley: false, taylor: true },
  },
];

const activity = [
  { time: "10:01 AM", type: "checkin", who: "Sam Patel",   text: "checked in — mood 7/10" },
  { time: "9:55 AM",  type: "checkin", who: "Riley Chen",  text: "checked in — mood 9/10" },
  { time: "9:50 AM",  type: "blocker", who: "Sam Patel",   text: "flagged a medium blocker — Figma access" },
  { time: "9:42 AM",  type: "checkin", who: "Alex Kim",    text: "checked in — mood 8/10" },
  { time: "8:20 AM",  type: "blocker", who: "Jordan Lee",  text: "flagged a critical blocker — auth tokens" },
  { time: "8:15 AM",  type: "cover",   who: "Jordan Lee",  text: "requested cover — out sick" },
];
