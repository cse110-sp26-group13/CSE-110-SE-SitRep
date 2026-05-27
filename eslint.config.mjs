import js from "@eslint/js";
import globals from "globals";

// The app ships as plain <script> files (no ES modules): each feature/page
// file defines top-level functions and state that sibling files call by name,
// relying on <script> load order. ESLint lints one file at a time, so it can
// neither see those cross-file definitions (false "not defined") nor see that
// a function is called elsewhere (false "defined but never used").
//
// This list is the documented cross-file API. It does double duty below:
//   1. registered as globals      → consumers don't trip `no-undef`
//   2. exempted from no-unused-vars → definers aren't flagged as "unused"
// Keep it in sync when a file exposes a new shared global function/value.
const appGlobals = [
  // shared state + persistence (state.js)
  "state",
  "defaultState",
  "saveState",
  "STORAGE_KEY",
  "teammates",
  "blockers",
  "team",
  "activity",
  "meetingSlots",
  // selectors (selectors.js)
  "effectiveTeammates",
  "effectiveBlockers",
  "effectiveActivity",
  "findBlockerById",
  "updateBlocker",
  "pushActivity",
  "setGithubIssues",
  // utils (utils.js)
  "escapeHTML",
  "moodClass",
  "nowTime",
  "avatar",
  // feature renderers / binders (js/features/*.js)
  "renderHeader",
  "renderKPIs",
  "renderCheckIns",
  "renderBlockers",
  "renderSlots",
  "renderMoodTrend",
  "renderActivity",
  "renderAll",
  "bindBlockerControls",
  "bindComposeForm",
  "bindMoodQuick",
  "initPalette",
  "initGHEmbeds",
  "renderPRChipsFor",
  // github integration (github-api.js)
  "fetchGitHubIssues",
  "fetchOpenPRs",
];

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...Object.fromEntries(appGlobals.map((name) => [name, "writable"])),
      },
    },
    rules: {
      "no-undef": "warn",
      // These symbols are defined in one file and used in others; don't flag
      // their definition as unused. Also ignore `_` throwaways (catch/args).
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: `^(?:${appGlobals.join("|")})$|^_`,
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // We intentionally both declare these as shared globals (above) and
      // define them once in their owning file; that isn't a real redeclaration.
      "no-redeclare": "off",
    },
  },
];
