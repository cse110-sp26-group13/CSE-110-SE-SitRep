# Splash Page Wireframe

Wireframe for the splash / onboarding flow described in [ADR-0004](../adr/0004-client-side-auth-gate-and-routing.md). Captured **before** implementation per the course rubric ("design artifacts should precede non-exploratory work").

## Flow overview

```
                                    ┌────────────────────────┐
   user lands on /splash.html ────▶ │  has Supabase session? │
                                    └────────────┬───────────┘
                                                 │
                              ┌──────────────────┼────────────────────┐
                              │                  │                    │
                          no session     session, no team       session + ≥1 team
                              │                  │                    │
                              ▼                  ▼                    ▼
                        ┌──────────┐       ┌──────────┐         ┌──────────────┐
                        │  AUTH    │       │  CIRCLE  │         │ redirect →   │
                        │  VIEW    │──────▶│  VIEW    │────────▶│ /index.html  │
                        └──────────┘       └──────────┘         └──────────────┘
                          signup/                create/
                          login                  join
```

## View A — Auth (signup / login)

Default tab: **Sign up**. Both forms live inside the same `<div class="splash-card">`; only one is visible at a time.

### A1. Signup, idle

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              SE SitRep                           │
│              ───────────                         │
│         Sign in to your circle                   │
│                                                  │
│   ┌─────────────┬─────────────┐                  │
│   │  Sign up    │   Log in    │ ← tabs           │
│   └─────────────┴─────────────┘                  │
│                                                  │
│   First name           Last name                 │
│   ┌──────────────────┐ ┌──────────────────┐      │
│   │ Shazi            │ │ B.               │      │
│   └──────────────────┘ └──────────────────┘      │
│                                                  │
│   Email                                          │
│   ┌────────────────────────────────────────┐     │
│   │ you@school.edu                         │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   Password                                       │
│   ┌────────────────────────────────────────┐     │
│   │ ••••••••                               │     │
│   └────────────────────────────────────────┘     │
│   ▰▰▰▰▱  Good                                    │ ← strength meter
│   ✓ At least 8 characters                        │   (appears once
│   ✓ Contains a letter                            │    user types)
│   ✓ Contains a number                            │
│   ○ Mixed case or a symbol                       │
│                                                  │
│   ┌────────────────────────────────────────┐     │
│   │           Create account               │ ← primary
│   └────────────────────────────────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘
```

Display name in the database is computed as `${firstName} ${lastName}` and stored via Supabase Auth `options.data.display_name` — the `handle_new_user` trigger picks it up into `profiles.display_name`.

### A2. Login

```
┌──────────────────────────────────────────────────┐
│              SE SitRep                           │
│         Welcome back                             │
│                                                  │
│   ┌─────────────┬─────────────┐                  │
│   │  Sign up    │  Log in     │  ← log in active │
│   └─────────────┴─────────────┘                  │
│                                                  │
│   Email                                          │
│   ┌────────────────────────────────────────┐     │
│   │ you@school.edu                         │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   Password                                       │
│   ┌────────────────────────────────────────┐     │
│   │ ••••••••                               │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   ┌────────────────────────────────────────┐     │
│   │              Log in                    │     │
│   └────────────────────────────────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### A3. Error states

Top-of-form banner — used for server-side errors that aren't tied to a specific field:

```
   ┌────────────────────────────────────────┐
   │ ⚠ Email or password is incorrect.      │  ← .splash-error
   └────────────────────────────────────────┘     (--bad tint)
```

Field-level errors — shown inline under the offending input on signup. The input gets a red border (`.splash-input--invalid`) and `aria-invalid="true"`:

```
   Email
   ┌────────────────────────────────────────┐
   │ you@school                             │  ← red border
   └────────────────────────────────────────┘
   ⚠ Domain needs a dot (like .com).
```

### A4. Busy state

Submit button text swaps to "Working…" and the button is `disabled`. Other inputs stay enabled but submission is no-op until the in-flight call resolves.

### A5. Email-confirmation-required success state

Shown after `signUp` when the Supabase project still has "Confirm email" enabled (we plan to turn this off for dev, but defensively handle the case):

```
   ┌────────────────────────────────────────┐
   │ ✓ Check your inbox to confirm your     │  ← .splash-success
   │   email, then log in.                  │     (--good tint)
   └────────────────────────────────────────┘
```

The auth view stays put on this state (does not advance to circle view).

## View B — Circle (create / join)

Shown after auth when `getUserMemberships()` returns an empty array. Default tab: **Create**.

### B1. Create, idle

```
┌──────────────────────────────────────────────────┐
│              Join or create a circle             │
│                                                  │
│   ┌─────────────┬─────────────┐                  │
│   │  Create     │   Join      │ ← tabs           │
│   └─────────────┴─────────────┘                  │
│                                                  │
│   Circle name                                    │
│   ┌────────────────────────────────────────┐     │
│   │ Group 13 — HardCoders                  │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   ┌────────────────────────────────────────┐     │
│   │           Create circle                │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   ─────────────────────────────────────────      │
│   Signed in as you@school.edu — [sign out]       │
└──────────────────────────────────────────────────┘
```

### B2. Join with 6-digit code

```
┌──────────────────────────────────────────────────┐
│              Join or create a circle             │
│                                                  │
│   ┌─────────────┬─────────────┐                  │
│   │  Create     │   Join      │  ← join active   │
│   └─────────────┴─────────────┘                  │
│                                                  │
│   6-digit invite code                            │
│   ┌────────────────────────────────────────┐     │
│   │ 4 8 2 9 1 7                            │ ← inputmode="numeric"
│   └────────────────────────────────────────┘     │   maxlength="6"
│                                                  │
│   ┌────────────────────────────────────────┐     │
│   │            Join circle                 │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   ─────────────────────────────────────────      │
│   Signed in as you@school.edu — [sign out]       │
└──────────────────────────────────────────────────┘
```

### B3. Error states

- Blank create: "Please enter a name for your circle."
- Bad join code: "That code doesn't match a circle."
- Non-digit input in code: client-side reject before submit (regex `/^\d{6}$/`).

## Mobile snapshot (375 px wide)

At `max-width: 480px` the card goes full-bleed: no border, no radius, `min-height: 100vh`, padding reduced to 20px. Forms and tabs stretch the full width.

```
┌──────────────────────────────┐
│                              │
│         SE SitRep            │
│      Sign in to your circle  │
│                              │
│  ┌──────────┬─────────────┐  │
│  │ Sign up  │   Log in    │  │
│  └──────────┴─────────────┘  │
│                              │
│  First name   Last name      │
│  ┌──────────┐ ┌────────────┐ │
│  │          │ │            │ │
│  └──────────┘ └────────────┘ │
│                              │
│  Email                       │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Password                    │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │     Create account     │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

## Visual spec

- Card: `max-width: 420px`, `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius)` (10px), padding `28px`.
- Tabs: text buttons, inactive `color: var(--text-muted)`, active `color: var(--accent)` with a `2px` bottom border in `--accent`.
- Inputs: `background: var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-sm)` (6px), padding `10px`, full width. Focus state: `border-color: var(--accent)`.
- Primary submit button: reuses `.btn-primary` from `css/base.css` (background `--accent`, white text).
- Error pill (`.splash-error`): `color: var(--bad)`, faint red background tint, 1px red border, 12px font.
- Success pill (`.splash-success`): same shape but in `--good`.
- Field error (`.splash-field-error`): 11px text in `--bad`, sits directly under the input. Paired with `.splash-input--invalid` (red border + red focus halo) on the input.
- Password strength meter: 4-segment bar above a requirements checklist. Hidden via `opacity/max-height` until the user types; segments grow `bad → orange → yellow → good` as 1/2/3/4 requirements pass.

## Out of scope for this iteration

- Password reset / "forgot password" link — backlog item.
- Social login (Google / GitHub) — backlog item.
- Multi-circle membership UI (today: user lands on dashboard tied to whatever team they joined or created first).
- Inviting teammates by email — out of scope; invites happen via the 6-digit join code only.
