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

const MOOD_LABELS = {
  2: "cooked", 4: "tired", 6: "surviving", 8: "chill", 10: "locked in"
};

// Inner SVG shapes for each mood (viewBox 0 0 100 100).
// moodSVG() wraps these in an <svg> tag at the requested size.
const MOOD_SVG_CONTENT = {
  2: `<path d="M50 13 C73 13 87 28 87 50 C87 72 73 87 50 87 C27 87 13 72 13 50 C13 28 27 13 50 13Z"/><ellipse cx="24" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><ellipse cx="76" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><line x1="27" y1="36" x2="43" y2="52" stroke-width="3"/><line x1="43" y1="36" x2="27" y2="52" stroke-width="3"/><line x1="57" y1="36" x2="73" y2="52" stroke-width="3"/><line x1="73" y1="36" x2="57" y2="52" stroke-width="3"/><path d="M31 71 Q40 64 50 71 Q60 78 69 71" stroke-width="2.8" fill="none"/><path d="M80 18 Q83 25 80 31 Q77 25 80 18Z" fill="currentColor" stroke="none"/>`,
  4: `<path d="M50 13 C73 13 87 28 87 50 C87 72 73 87 50 87 C27 87 13 72 13 50 C13 28 27 13 50 13Z"/><ellipse cx="23" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><ellipse cx="77" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><line x1="27" y1="44" x2="43" y2="44" stroke-width="2.8"/><path d="M27 44 Q35 55 43 44" stroke-width="2.8" fill="none"/><line x1="57" y1="44" x2="73" y2="44" stroke-width="2.8"/><path d="M57 44 Q65 55 73 44" stroke-width="2.8" fill="none"/><path d="M27 53 Q35 58 43 53" stroke-width="1.8" fill="none"/><path d="M57 53 Q65 58 73 53" stroke-width="1.8" fill="none"/><path d="M37 71 Q50 67 63 71" stroke-width="2.8" fill="none"/>`,
  6: `<path d="M50 13 C73 13 87 28 87 50 C87 72 73 87 50 87 C27 87 13 72 13 50 C13 28 27 13 50 13Z"/><ellipse cx="23" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><ellipse cx="77" cy="61" rx="10" ry="5.5" fill="#FFB6C1" stroke="none"/><circle cx="35" cy="44" r="9" stroke-width="2.5"/><line x1="26" y1="44" x2="44" y2="44" stroke-width="3"/><circle cx="35" cy="49" r="3" fill="currentColor" stroke="none"/><path d="M26 53 Q35 57 44 53" stroke-width="1.8" fill="none"/><circle cx="65" cy="44" r="9" stroke-width="2.5"/><line x1="56" y1="44" x2="74" y2="44" stroke-width="3"/><circle cx="65" cy="49" r="3" fill="currentColor" stroke="none"/><path d="M56 53 Q65 57 74 53" stroke-width="1.8" fill="none"/><path d="M40 70 Q50 67 60 70" stroke-width="2.8" fill="none"/><path d="M80 19 Q83 26 80 32 Q77 26 80 19Z" fill="currentColor" stroke="none"/>`,
  8: `<path d="M50 13 C73 13 87 28 87 50 C87 72 73 87 50 87 C27 87 13 72 13 50 C13 28 27 13 50 13Z"/><ellipse cx="21" cy="57" rx="12" ry="7" fill="#FFB6C1" stroke="none"/><ellipse cx="79" cy="57" rx="12" ry="7" fill="#FFB6C1" stroke="none"/><path d="M27 47 Q35 36 43 47" stroke-width="3" fill="none"/><path d="M57 47 Q65 36 73 47" stroke-width="3" fill="none"/><path d="M29 66 Q50 84 71 66" stroke-width="3" fill="none"/>`,
  10: `<path d="M50 13 C73 13 87 28 87 50 C87 72 73 87 50 87 C27 87 13 72 13 50 C13 28 27 13 50 13Z"/><ellipse cx="23" cy="62" rx="8" ry="4.5" fill="#FFB6C1" stroke="none"/><ellipse cx="77" cy="62" rx="8" ry="4.5" fill="#FFB6C1" stroke="none"/><path d="M23 33 Q33 28 44 40" stroke-width="3"/><path d="M56 40 Q67 28 77 33" stroke-width="3"/><circle cx="35" cy="47" r="9.5" stroke-width="2.5"/><circle cx="35" cy="47" r="7" fill="currentColor" stroke="none"/><circle cx="38" cy="44" r="2" fill="white" stroke="none"/><circle cx="65" cy="47" r="9.5" stroke-width="2.5"/><circle cx="65" cy="47" r="7" fill="currentColor" stroke="none"/><circle cx="68" cy="44" r="2" fill="white" stroke="none"/><line x1="76" y1="18" x2="83" y2="11" stroke-width="2.2"/><line x1="81" y1="25" x2="89" y2="20" stroke-width="2.2"/><line x1="80" y1="32" x2="88" y2="29" stroke-width="2.2"/><line x1="38" y1="70" x2="62" y2="70" stroke-width="2.8"/>`,
};

function moodSVG(bucket, extraClass) {
  const inner = MOOD_SVG_CONTENT[bucket];
  if (!inner) return "";
  const cls = extraClass ? `mood-icon ${extraClass}` : "mood-icon";
  return `<svg class="${cls}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/**
 * The emoji face for a mood score, or "—" when no mood is set.
 *
 * @param {number|null|undefined} score
 * @returns {string}
 */
function moodFace(score) {
  const b = moodBucket(score);
  return b == null ? "" : moodSVG(b);
}

/** @returns {number|null} the current user's mood today, or null if unset. */
function currentUserMood() {
  return teammates.find(t => t.id === team.currentUserId)?.mood ?? null;
}

/**
 * Light-touch render: highlight the selected mood-quick face for the
 * current user and update the panel subtitle. Called from
 * renderCheckIns() and from the mood-quick click handler.
 */
function renderMoodQuick() {
  const bucket = moodBucket(currentUserMood());
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.classList.toggle(
      "selected",
      Number(b.dataset.mood) === bucket
    )
  );
  const sub = document.getElementById("mood-quick-sub");
  if (sub) {
    sub.textContent = "";
  }
  const iconHolder =
    document.getElementById("selected-mood-icon");
  if (iconHolder) {
    iconHolder.innerHTML =
      bucket == null
        ? ""
        : moodSVG(bucket, "mood-icon-xs");
  }
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
    const hasRealStandup = !!t.lastCheckIn;
    if (
      t.id === team.currentUserId &&
      !hasRealStandup
    ) {
      return "";
    }
    const cls = ["checkin-row",
      t.coverNeeded ? "cover" : "",
      !t.lastCheckIn ? "stale" : "",
    ].filter(Boolean).join(" ");

    const hasExplicitMood = t.lastCheckIn && t.mood != null;

    const moodPill = hasExplicitMood
      ? `<span class="mood-pill ${moodClass(t.mood)}">${moodSVG(moodBucket(t.mood), "mood-icon-sm")}</span>`
      : "";
    const ts = t.lastCheckIn?.time ?? "Not checked in";

    // "Today" note — what they're working on right now
    const today = t.lastCheckIn?.today;

    // "Yesterday" note — what they completed; only show if present
    const yesterday = t.lastCheckIn?.yesterday;

    // Inline blocker note from their standup; only show if non-empty
    const blockerNote = t.lastCheckIn?.blockers;

    const coverBadge = t.coverNeeded ? `<span class="cover-badge">Cover needed</span>` : "";
    const isMe =
      t.id === team.currentUserId &&
      !!t.lastCheckIn;
    const ownActions = isMe ? `
      <div class="own-checkin-actions">
        <button class="checkin-edit-btn" data-edit="${t.id}">Edit</button>
        <button class="checkin-delete-btn" data-delete="${t.id}">Delete</button>
      </div>
    ` : "";
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
            ${ownActions}
          </div>
        </div>
        ${actions}
      </li>`;
  }).join("");

  document.querySelectorAll("[data-msg]").forEach(b =>
    b.addEventListener("click", () => handleMessage(b.dataset.msg)));
  document.querySelectorAll("[data-take]").forEach(b =>
    b.addEventListener("click", () => handleTakeCover(b.dataset.take)));
  document.querySelectorAll("[data-edit]").forEach(b =>
    b.addEventListener("click", () => handleEditCheckin(b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b =>
    b.addEventListener("click", () => handleDeleteCheckin(b.dataset.delete)));
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

function renderMoodSelector() {
  document.querySelectorAll("#mood-faces .mood-face").forEach(btn => {
    const bucket = Number(btn.dataset.mood);
    const existing = btn.querySelector(".mood-icon");
    if (existing) existing.remove();
    btn.insertAdjacentHTML("afterbegin", moodSVG(bucket));
  });
}


function bindMoodQuick() {
  renderMoodSelector();
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.addEventListener("click", async () => {
      const me = teammates.find(t => t.id === team.currentUserId);
      if (!me) return;
      const score = Number(b.dataset.mood);
      const nextMood = me.mood === score ? null : score;
      await db.saveMood(nextMood);
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

  function openCheckinForm() {
    form.hidden = false;
    document.getElementById("yesterday-input").focus();
  }

  document
    .getElementById("post-checkin-btn")
    .addEventListener("click", openCheckinForm);

  document
    .getElementById("inline-post-btn")
    .addEventListener("click", openCheckinForm);

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

    const isEditing = form.dataset.editing === "true";

    await db.saveStandupCompose({
      yesterday,
      today: todayText,
      blockersNote: blockerNote,
    });

    if (!isEditing) {
      const mood = me.mood;
      const parts = [];
      if (mood != null) parts.push(`mood: ${MOOD_LABELS[moodBucket(mood)] ?? mood}`);
      if (yesterday)    parts.push(`yesterday: ${yesterday}`);
      if (todayText)    parts.push(`today: ${todayText}`);
      await db.addActivity("checkin", `posted standup${parts.length ? ` — ${parts.join(" · ")}` : ""}`);
    }

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
    delete form.dataset.editing;
    renderAll();
  });
}

function handleEditCheckin(id) {
  if (id !== team.currentUserId) return;

  const data = teammates.find(t => t.id === id)?.lastCheckIn;
  if (!data) return;

  const form = document.getElementById("checkin-form");

  form.hidden = false;

  document.getElementById("yesterday-input").value =
    data.yesterday || "";

  document.getElementById("today-input").value =
    data.today || "";

  document.getElementById("blockers-input").value =
    data.blockers || "";

  form.dataset.editing = "true";
}

function handleDeleteCheckin(id) {
  if (id !== team.currentUserId) return;

  const modal = document.getElementById("delete-modal");

  modal.classList.remove("hidden");

  document.getElementById("cancel-delete-btn").onclick = () => {
    modal.classList.add("hidden");
  };

  document.getElementById("confirm-delete-btn").onclick = async () => {
    await db.saveStandupCompose({ yesterday: null, today: null, blockersNote: null });
    modal.classList.add("hidden");
    await db.loadAll();
    renderAll();
  };
}
