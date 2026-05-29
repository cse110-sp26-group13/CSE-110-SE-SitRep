/**
 * Check-ins panel — mood quick-picker, everyone's standup cards, and
 * the compose form for "yesterday / today / blockers". A blocker in
 * the compose form auto-opens a high-severity issue so it shows up
 * in the blockers panel without a separate step.
 */

/**
 * Snap a 1–10 mood score to one of five emoji buckets (2/4/6/8/10).
 *
 * @param {number|null|undefined} score
 * @returns {2|4|6|8|10|null}
 */
function moodBucket(score) {
  if (score == null) return null;
  if (score <= 2) return 2;
  if (score <= 4) return 4;
  if (score <= 6) return 6;
  if (score <= 8) return 8;
  return 10;
}

const MOOD_FACES = { 2: "😢", 4: "🙁", 6: "😐", 8: "🙂", 10: "😄" };

/**
 * The emoji face for a mood score, or "—" when no mood is set.
 *
 * @param {number|null|undefined} score
 * @returns {string}
 */
function moodFace(score) {
  const b = moodBucket(score);
  return b == null ? "—" : MOOD_FACES[b];
}

/** @returns {number|null} the current user's mood today, or null if unset. */
function currentUserMood() {
  const me = teammates.find(t => t.id === team.currentUserId);
  return me?.mood ?? null;
}

/**
 * Light-touch render: highlight the selected mood-quick face for the
 * current user and update the panel subtitle. Called from
 * renderCheckIns() and from the mood-quick click handler.
 */
function renderMoodQuick() {
  const bucket = moodBucket(currentUserMood());
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.classList.toggle("selected", Number(b.dataset.mood) === bucket));
  const sub = document.getElementById("mood-quick-sub");
  if (sub) sub.textContent = bucket == null ? "Tap a face" : `You · ${MOOD_FACES[bucket]}`;
}

/**
 * Render the full check-in list — one row per teammate with their
 * yesterday/today/blocker notes, mood pill, last-posted timestamp,
 * and "cover needed" affordances when applicable. Binds the "I'll
 * cover" and "Message" buttons inline.
 */
function renderCheckIns() {
  renderMoodQuick();

  const tm = effectiveTeammates();
  const checkedIn = tm.filter(t => t.lastCheckIn).length;
  document.getElementById("checkins-sub").textContent = `${checkedIn} of ${tm.length}`;

  document.getElementById("checkin-list").innerHTML = tm.map(t => {
    const cls = ["checkin-row",
      t.coverNeeded ? "cover" : "",
      !t.lastCheckIn ? "stale" : "",
    ].filter(Boolean).join(" ");

    const moodPill = `<span class="mood-pill ${moodClass(t.mood)}">${moodFace(t.mood)}</span>`;
    const ts = t.lastCheckIn?.time ?? "Not checked in";

    // "Today" note — what they're working on right now
    const today = t.lastCheckIn?.today;

    // "Yesterday" note — what they completed; only show if present
    const yesterday = t.lastCheckIn?.yesterday;

    // Inline blocker note from their standup; only show if non-empty
    const blockerNote = t.lastCheckIn?.blockers;

    const coverBadge = t.coverNeeded ? `<span class="cover-badge">Cover needed</span>` : "";
    const actions = t.coverNeeded ? `
      <div class="checkin-actions">
        <button class="cover-take-btn" data-take="${t.id}">I'll cover</button>
        <button class="cover-msg-btn" data-msg="${t.id}">Message</button>
      </div>` : "";

    return `
      <li class="${cls}">
        ${avatar(t.name, t.id)}
        <div>
          <div>
            <span class="checkin-name">${escapeHTML(t.name)}</span>
            <span class="checkin-role">${escapeHTML(t.role)}</span>
          </div>

          ${yesterday ? `<div class="checkin-note checkin-yesterday"><span class="checkin-field-label">Yesterday:</span> ${escapeHTML(yesterday)}</div>` : ""}

          ${today ? `<div class="checkin-note checkin-today"><span class="checkin-field-label">Today:</span> ${escapeHTML(today)}</div>` : ""}

          ${blockerNote ? `<div class="checkin-note checkin-blocker"><span class="checkin-field-label">Blocker:</span> ${escapeHTML(blockerNote)}</div>` : ""}

          <div class="checkin-meta">
            ${moodPill}
            <span>· ${escapeHTML(ts)}</span>
            ${coverBadge}
          </div>
        </div>
        ${actions}
      </li>`;
  }).join("");

  document.querySelectorAll("[data-msg]").forEach(b =>
    b.addEventListener("click", () => handleMessage(b.dataset.msg)));
  document.querySelectorAll("[data-take]").forEach(b =>
    b.addEventListener("click", () => handleTakeCover(b.dataset.take)));
}

/**
 * Send a quick message to a teammate who needs cover. Prompt-based
 * for v1 — there's no inbox yet, so the message just lands in the
 * activity feed as a "cover" event.
 *
 * @param {string} id - teammate id.
 */
async function handleMessage(id) {
  const t = teammates.find(x => x.id === id);
  if (!t) return;
  const note = t.coverNote ? `\n\nTheir note: "${t.coverNote}"` : "";
  const msg = prompt(`Quick message to ${t.name}:${note}`,
    `Hey ${t.name.split(" ")[0]}, I can take that.`);
  if (!msg) return;
  await db.addActivity("cover", `messaged ${t.name}: "${msg}"`);
  await db.loadAll();
  renderActivity();
}

/**
 * Claim cover for a teammate's shift — logs an "is covering for X"
 * activity event and re-renders. No persistent cover assignment yet;
 * the activity event is the record.
 *
 * @param {string} id - teammate id.
 */
async function handleTakeCover(id) {
  const t = teammates.find(x => x.id === id);
  if (!t) return;
  await db.addActivity("cover", `is covering for ${t.name} today`);
  await db.loadAll();
  renderAll();
}

/**
 * One-time setup: clicking a mood-quick face saves the score and
 * re-renders. Called once per page load — handlers persist for the
 * lifetime of the page.
 */
function bindMoodQuick() {
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.addEventListener("click", async () => {
      const me = teammates.find(t => t.id === team.currentUserId);
      if (!me) return;
      const score = Number(b.dataset.mood);
      await db.saveMood(score);
      await db.loadAll();
      renderAll();
    }));
}

/**
 * One-time setup for the standup compose form. Wires up the open /
 * cancel buttons plus the submit handler that saves the standup,
 * appends an activity event, and (if a blocker note was provided)
 * spawns a high-severity blocker for the current user.
 */
function bindComposeForm() {
  const form = document.getElementById("checkin-form");

  document.getElementById("post-checkin-btn").addEventListener("click", () => {
    form.hidden = false;
    document.getElementById("yesterday-input").focus();
  });
  document.getElementById("cancel-checkin").addEventListener("click", () => {
    form.hidden = true;
    form.reset();
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const yesterday = document.getElementById("yesterday-input").value.trim();
    const todayText = document.getElementById("today-input").value.trim();
    const blockerNote = document.getElementById("blockers-input").value.trim();
    const me = teammates.find(t => t.id === team.currentUserId);
    if (!me) return;

    await db.saveStandupCompose({ yesterday, today: todayText, blockersNote: blockerNote });

    const mood = me.mood;
    const parts = [];
    if (mood != null)   parts.push(`mood ${moodFace(mood)}`);
    if (yesterday)      parts.push(`yesterday: ${yesterday}`);
    if (todayText)      parts.push(`today: ${todayText}`);
    await db.addActivity("checkin",
      `posted standup${parts.length ? ` — ${parts.join(" · ")}` : ""}`);

    if (blockerNote) {
      await db.createBlocker({
        title: blockerNote,
        description: "",
        severity: "high",
        ownerId: me.id,
        category: null,
      });
      await db.addActivity("blocker", `opened a high issue — ${blockerNote}`);
    }

    await db.loadAll();
    form.hidden = true;
    form.reset();
    renderAll();
  });
}
