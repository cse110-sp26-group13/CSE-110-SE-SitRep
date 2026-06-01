import js from "@eslint/js";

// Project-wide globals. SE SitRep loads each JS file as a <script> tag in a
// fixed order (see index.html / splash.html / etc.) — there are no modules,
// so cross-file references look "undefined" to ESLint unless we declare them.
//
// Anything assigned to `window.*` from one file and read as a bare name from
// another belongs here.
const projectGlobals = {
  // From js/db.js
  db: "readonly",
  team: "writable",
  teammates: "writable",
  blockers: "writable",
  meetingSlots: "writable",
  activity: "writable",

  // From js/state.js
  state: "writable",
  saveState: "readonly",
  setGithubIssues: "readonly",

  // From js/utils.js
  escapeHTML: "readonly",
  moodClass: "readonly",
  avatar: "readonly",

  // From js/selectors.js
  effectiveTeammates: "readonly",
  effectiveBlockers: "readonly",
  effectiveActivity: "readonly",
  findBlockerById: "readonly",

  // From js/auth.js / supabaseClient.js (also live on window for cross-page use)
  auth: "readonly",
  sbClient: "readonly",
  activeCircle: "readonly",
  PwStrength: "readonly",
  SUPABASE_CONFIG: "readonly",

  // From js/features/* — render and bind helpers called across files
  renderHeader: "readonly",
  renderKPIs: "readonly",
  renderMoodTrend: "readonly",
  renderActivity: "readonly",
  renderCheckIns: "readonly",
  moodBucket: "readonly",
  moodSVG: "readonly",
  MOOD_LABELS: "readonly",
  renderBlockers: "readonly",
  openDetailModal: "readonly",
  renderSlots: "readonly",
  renderAllAI: "readonly",
  moodFace: "readonly",
  bindBlockerControls: "readonly",
  bindMoodQuick: "readonly",
  bindComposeForm: "readonly",
  bindAgentModelLink: "readonly",
  bindCostPreview: "readonly",
  bindAILogForm: "readonly",
  bindSessionDialog: "readonly",
  fetchGitHubIssues: "readonly",
  aiKPIData: "readonly",

  // From js/pages/* — page orchestrators assign their renderer to window.renderAll
  renderAll: "writable",
};

// Browser/runtime globals (we don't want to pull in the `globals` package).
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  navigator: "readonly",
  location: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  fetch: "readonly",
  alert: "readonly",
  prompt: "readonly",
  confirm: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  HTMLElement: "readonly",
  HTMLFormElement: "readonly",
  HTMLInputElement: "readonly",
  SubmitEvent: "readonly",
  Node: "readonly",
  CSS: "readonly",
};

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...browserGlobals,
        ...projectGlobals,
      },
    },
    rules: {
      // The convention is `function foo() { ... }` at file scope + a `window.foo = foo`
      // export at the bottom. ESLint sees those top-level declarations as
      // redeclaring globals — that's exactly the design here, so turn the
      // check off rather than fight it.
      "no-redeclare": "off",
      // `no-unused-vars` is noisy in this codebase because every feature
      // module defines functions that are only ever called from other files
      // (page orchestrators, etc.) — ESLint can't see those cross-file uses.
      // Keep it on for *local* vars and args (still catches typos within a
      // file) but ignore unused function declarations at the top level.
      "no-unused-vars": ["warn", {
        vars: "local",
        args: "after-used",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-undef": "warn",
    },
  },
];
