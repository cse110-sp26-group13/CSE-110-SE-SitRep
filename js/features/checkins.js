function moodBucket(score) {
  if (score == null) return null;
  if (score <= 2) return 2;
  if (score <= 4) return 4;
  if (score <= 6) return 6;
  if (score <= 8) return 8;
  return 10;
}

const MOOD_FACES = { 2: "😢", 4: "🙁", 6: "😐", 8: "🙂", 10: "😄" };

function moodFace(score) {
  const b = moodBucket(score);
  return b == null ? "—" : MOOD_FACES[b];
}

function currentUserMood() {
  const me = teammates.find(t => t.id === team.currentUserId);
  return state.extraCheckIns[team.currentUserId]?.mood ?? me?.mood ?? null;
}

function renderMoodQuick() {
  const bucket = moodBucket(currentUserMood());
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.classList.toggle("selected", Number(b.dataset.mood) === bucket));
  const sub = document.getElementById("mood-quick-sub");
  if (sub) sub.textContent = bucket == null ? "Tap a face" : `You · ${MOOD_FACES[bucket]}`;
}

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
    const today = t.lastCheckIn?.today;
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
          ${today ? `<div class="checkin-note">${escapeHTML(today)}</div>` : ""}
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

function handleMessage(id) {
  const t = teammates.find(x => x.id === id);
  if (!t) return;
  const note = t.coverNote ? `\n\nTheir note: "${t.coverNote}"` : "";
  const msg = prompt(`Quick message to ${t.name}:${note}`,
    `Hey ${t.name.split(" ")[0]}, I can take that.`);
  if (!msg) return;
  pushActivity({
    type: "cover",
    who: "You",
    text: `messaged ${t.name}: "${msg}"`,
  });
  saveState();
  renderActivity();
}

function handleTakeCover(id) {
  const t = teammates.find(x => x.id === id);
  if (!t) return;
  if (!state.coveredFor.includes(id)) state.coveredFor.push(id);
  pushActivity({
    type: "cover",
    who: "You",
    text: `is covering for ${t.name} today`,
  });
  saveState();
  renderAll();
}

function bindMoodQuick() {
  document.querySelectorAll("#mood-faces .mood-face").forEach(b =>
    b.addEventListener("click", () => {
      const me = teammates.find(t => t.id === team.currentUserId);
      if (!me) return;
      const score = Number(b.dataset.mood);
      const prev = state.extraCheckIns[me.id] || {};
      state.extraCheckIns[me.id] = { ...prev, mood: score, time: prev.time || nowTime() };
      saveState();
      renderAll();
    }));
}

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

  form.addEventListener("submit", e => {
    e.preventDefault();
    const yesterday = document.getElementById("yesterday-input").value.trim();
    const today = document.getElementById("today-input").value.trim();
    const blockerNote = document.getElementById("blockers-input").value.trim();
    const me = teammates.find(t => t.id === team.currentUserId);
    if (!me) return;

    const prev = state.extraCheckIns[me.id] || {};
    const mood = prev.mood ?? me.mood ?? null;
    state.extraCheckIns[me.id] = {
      ...prev,
      time: nowTime(),
      mood,
      yesterday,
      today,
      blockers: blockerNote,
    };

    pushActivity({
      type: "checkin",
      who: me.name,
      text: `posted standup${mood != null ? ` — mood ${moodFace(mood)}` : ""}${today ? ` · ${today}` : ""}`,
    });

    if (blockerNote) {
      state.extraBlockers.unshift({
        id: `u${Date.now()}`,
        title: blockerNote,
        description: "",
        severity: "high",
        status: "open",
        ownerId: me.id,
        owner: me.name,
        postedAt: nowTime(),
        comments: [],
      });
      pushActivity({
        type: "blocker",
        who: me.name,
        text: `opened a high issue — ${blockerNote}`,
      });
    }

    saveState();
    form.hidden = true;
    form.reset();
    renderAll();
  });
}
