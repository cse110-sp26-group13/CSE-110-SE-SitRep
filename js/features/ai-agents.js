/**
 * @fileoverview AI Agents feature module.
 * Handles logging, rendering, cost-estimation, and session editing for AI agent sessions.
 * Follows the same pattern as checkins.js and activity.js.
 * Data is stored in state.aiSessions (localStorage) mirroring the
 * extraCheckIns / extraActivity pattern used across the app.
 * When the Supabase `ai_activity` table is wired up, the load/save
 * functions below are the integration points.
 */

// ── Agent → Model map ──────────────────────────────────────────────────────
/**
 * Maps each agent key to the models it supports.
 * Drives the model dropdown dynamically — when the agent changes,
 * the model select repopulates from this map.
 * @type {Object.<string, Array<{value: string, label: string}>>}
 */
const AGENT_MODELS = {
  "claude-code": [
    { value: "claude-haiku-4-5",  label: "Claude Haiku 4.5"  },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4",     label: "Claude Opus 4"     },
  ],
  "copilot": [
    { value: "copilot-gpt-4o",   label: "GPT-4o (via Copilot)"      },
    { value: "copilot-gpt-4-1",  label: "GPT-4.1 (via Copilot)"     },
    { value: "copilot-claude",   label: "Claude (via Copilot)"       },
    { value: "copilot-gemini",   label: "Gemini (via Copilot)"       },
  ],
  "cursor": [
    { value: "cursor-gpt-4o",     label: "GPT-4o"              },
    { value: "cursor-claude-3-7", label: "Claude 3.7 Sonnet"   },
    { value: "cursor-gemini-2-5", label: "Gemini 2.5 Pro"      },
    { value: "cursor-fast",       label: "Cursor Fast (built-in)" },
  ],
  "chatgpt": [
    { value: "gpt-4o",      label: "GPT-4o"      },
    { value: "gpt-4-1",     label: "GPT-4.1"     },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "o3",          label: "o3"          },
    { value: "o4-mini",     label: "o4-mini"     },
  ],
  "gemini": [
    { value: "gemini-2-5-pro",   label: "Gemini 2.5 Pro"   },
    { value: "gemini-2-5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2-0-flash", label: "Gemini 2.0 Flash" },
  ],
  "other": [
    { value: "other", label: "Other / Unknown" },
  ],
};

// ── Pricing constants ──────────────────────────────────────────────────────
/**
 * Per-model token cost rates (USD per 1 million tokens).
 * Input/output rates where known; 0 for flat-subscription tools.
 * @type {Object.<string, {input: number, output: number}>}
 */
const MODEL_RATES = {
  // Claude
  "claude-haiku-4-5":  { input: 0.80,  output: 4.00  },
  "claude-sonnet-4-5": { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-6": { input: 3.00,  output: 15.00 },
  "claude-opus-4":     { input: 15.00, output: 75.00 },
  // ChatGPT
  "gpt-4o":            { input: 2.50,  output: 10.00 },
  "gpt-4-1":           { input: 2.00,  output: 8.00  },
  "gpt-4o-mini":       { input: 0.15,  output: 0.60  },
  "o3":                { input: 10.00, output: 40.00 },
  "o4-mini":           { input: 1.10,  output: 4.40  },
  // Gemini
  "gemini-2-5-pro":    { input: 1.25,  output: 10.00 },
  "gemini-2-5-flash":  { input: 0.15,  output: 0.60  },
  "gemini-2-0-flash":  { input: 0.10,  output: 0.40  },
  // Subscription tools — no per-token cost
  "copilot-gpt-4o":    { input: 0, output: 0 },
  "copilot-gpt-4-1":   { input: 0, output: 0 },
  "copilot-claude":    { input: 0, output: 0 },
  "copilot-gemini":    { input: 0, output: 0 },
  "cursor-gpt-4o":     { input: 0, output: 0 },
  "cursor-claude-3-7": { input: 0, output: 0 },
  "cursor-gemini-2-5": { input: 0, output: 0 },
  "cursor-fast":       { input: 0, output: 0 },
  "other":             { input: 0, output: 0 },
};

/** Human-readable labels for the agent name dropdown. */
const AGENT_LABELS = {
  "claude-code": "Claude Code",
  "copilot":     "GitHub Copilot",
  "cursor":      "Cursor",
  "chatgpt":     "ChatGPT",
  "gemini":      "Gemini",
  "other":       "Other",
};

/** CSS badge modifier per agent key. */
const AGENT_BADGE_CLASS = {
  "claude-code": "claude",
  "copilot":     "copilot",
  "cursor":      "cursor",
  "chatgpt":     "chatgpt",
  "gemini":      "gemini",
  "other":       "",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Cost estimation ────────────────────────────────────────────────────────
/**
 * Estimates the USD cost for a session given token count and model.
 * Assumes a 70/30 input/output token split when only a total is provided.
 */
function estimateCost(tokens, model) {
  if (!tokens || tokens <= 0) return 0;
  const rate = MODEL_RATES[model];
  if (!rate) return 0;
  if (rate.input === 0 && rate.output === 0) return 0;
  const inputTokens  = tokens * 0.7;
  const outputTokens = tokens * 0.3;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

/**
 * Formats a cost number as a display string.
 */
function formatCost(cost) {
  if (cost === 0) return "—";
  if (cost < 0.01) return `~$${cost.toFixed(4)}`;
  return `~$${cost.toFixed(2)}`;
}

// ── Weekly burn chart ──────────────────────────────────────────────────────
/** Current week offset: 0 = this week, -1 = last week, etc. */
let _weekOffset = 0;

/**
 * Returns the Monday and Sunday (as Date objects) for the week at the given offset.
 * offset=0 → current week, offset=-1 → last week, etc.
 */
function getWeekRange(offset) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, …
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

/**
 * Formats a Date as YYYY-MM-DD (local time).
 */
function dateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date as "Mon D" (e.g. "Jun 2").
 */
function formatShortDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Returns 7 entries (Mon–Sun) for the given week offset.
 * Days with no sessions get tokens: 0.
 */
function computeWeekBurn(sessions, offset) {
  const { start } = getWeekRange(offset);
  const byDate = {};
  sessions.forEach(s => {
    byDate[s.date] = (byDate[s.date] || 0) + (s.tokensUsed || 0);
  });

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = dateToISO(d);
    return { date: iso, tokens: byDate[iso] || 0, dayLabel: DAY_LABELS[i] };
  });
}

/**
 * Renders the weekly token burn bar chart.
 * Always shows 7 bars (Mon–Sun). Empty days show a ghost bar.
 */
function renderBurnChart(container, burnData, weekLabel) {
  const maxTokens = Math.max(...burnData.map(d => d.tokens), 1);
  const todayISO_ = todayISO();

  container.innerHTML = burnData.map(({ date, tokens, dayLabel }) => {
    const isEmpty = tokens === 0;
    const isToday = date === todayISO_;
    const pct = isEmpty ? 0 : Math.max(Math.round((tokens / maxTokens) * 100), 4);
    const tokLabel = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : (tokens > 0 ? String(tokens) : "");
    const barMod = isEmpty ? "ai-burn-bar--empty" : (isToday ? "ai-burn-bar--today" : "");
    const wrapMod = isToday ? "ai-burn-bar-wrap--today" : "";
    return `
      <div class="ai-burn-bar-wrap ${wrapMod}" title="${date}: ${tokens.toLocaleString()} tokens">
        <div class="ai-burn-count">${escapeHTML(tokLabel)}</div>
        <div class="ai-burn-bar ${barMod}" style="height:${pct}%" aria-label="${escapeHTML(tokLabel || "0")} tokens on ${escapeHTML(date)}"></div>
        <div class="ai-burn-day${isToday ? " ai-burn-day--today" : ""}">${escapeHTML(dayLabel)}</div>
      </div>`;
  }).join("");
}

// ── State helpers ──────────────────────────────────────────────────────────
function todayISO() {
  return dateToISO(new Date());
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function loadAIActivity() {
  return state.aiSessions || [];
}

function saveAISession(session) {
  if (!state.aiSessions) state.aiSessions = [];
  state.aiSessions.unshift(session);
  saveState();
}

function updateAISession(id, patch) {
  if (!state.aiSessions) return;
  const idx = state.aiSessions.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.aiSessions[idx] = { ...state.aiSessions[idx], ...patch };
  saveState();
}

// ── KPI helpers (consumed by kpis.js on the main dashboard) ───────────────
/**
 * Computes AI-specific KPI values from all stored sessions.
 * Called by kpis.js to populate the main dashboard KPI strip.
 */
function aiKPIData() {
  const sessions    = loadAIActivity();
  const today       = todayISO();
  const todayCount  = sessions.filter(s => s.date === today).length;
  const sprintTokens = sessions.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
  const sprintCost   = sessions.reduce((sum, s) => sum + (s.costUSD    || 0), 0);
  const reviewed    = sessions.filter(s => s.wasReviewed).length;
  const total       = sessions.length;
  const reviewRate  = total === 0 ? "—" : `${reviewed}/${total}`;
  return { todayCount, sprintTokens, sprintCost, reviewRate };
}

// ── Model dropdown ─────────────────────────────────────────────────────────
function repopulateModelSelect(agentKey, selectEl, currentValue) {
  const sel = selectEl || document.getElementById("ai-model-select");
  if (!sel) return;
  const models = AGENT_MODELS[agentKey] || AGENT_MODELS["other"];
  sel.innerHTML = models.map(m =>
    `<option value="${escapeHTML(m.value)}"${m.value === currentValue ? " selected" : ""}>${escapeHTML(m.label)}</option>`
  ).join("");
}

// ── Session detail / edit dialog ───────────────────────────────────────────
let _activeSessionId = null;

function openSessionDialog(sessionId) {
  const session = loadAIActivity().find(s => s.id === sessionId);
  if (!session) return;
  _activeSessionId = sessionId;

  const overlay = document.getElementById("ai-session-overlay");
  if (!overlay) return;

  const agentLabel = AGENT_LABELS[session.agentName] || session.agentName;
  overlay.querySelector(".ai-dialog-agent-label").textContent = agentLabel;
  overlay.querySelector(".ai-dialog-time").textContent        = `${session.date} · ${session.time}`;

  const agentSel  = overlay.querySelector("#dlg-agent-select");
  const modelSel  = overlay.querySelector("#dlg-model-select");
  const taskArea  = overlay.querySelector("#dlg-task-input");
  const tokInput  = overlay.querySelector("#dlg-tokens-input");
  const costPrev  = overlay.querySelector("#dlg-cost-preview");
  const reviewed  = overlay.querySelector("#dlg-reviewed-check");
  const prInput   = overlay.querySelector("#dlg-pr-input");

  agentSel.value  = session.agentName;
  repopulateModelSelect(session.agentName, modelSel, session.model);
  taskArea.value  = session.taskDesc || "";
  tokInput.value  = session.tokensUsed || "";
  reviewed.checked = !!session.wasReviewed;
  prInput.value   = session.prLink || "";

  if (session.costUSD > 0) {
    costPrev.textContent = `Logged cost: ${formatCost(session.costUSD)}`;
    costPrev.classList.add("has-value");
  } else {
    costPrev.textContent = "";
    costPrev.classList.remove("has-value");
  }

  overlay.hidden = false;
  overlay.querySelector(".ai-dialog-box").focus();
}

function closeSessionDialog() {
  const overlay = document.getElementById("ai-session-overlay");
  if (overlay) overlay.hidden = true;
  _activeSessionId = null;
}

function handleSessionEdit() {
  if (!_activeSessionId) return;

  const overlay   = document.getElementById("ai-session-overlay");
  const agentName = overlay.querySelector("#dlg-agent-select").value;
  const model     = overlay.querySelector("#dlg-model-select").value;
  const taskDesc  = overlay.querySelector("#dlg-task-input").value.trim();
  const tokRaw    = parseInt(overlay.querySelector("#dlg-tokens-input").value, 10);
  const tokensUsed = isNaN(tokRaw) ? 0 : tokRaw;
  const wasReviewed = overlay.querySelector("#dlg-reviewed-check").checked;
  const prLink    = overlay.querySelector("#dlg-pr-input").value.trim();

  if (!taskDesc) return;

  const costUSD = estimateCost(tokensUsed, model);
  updateAISession(_activeSessionId, { agentName, model, taskDesc, tokensUsed, costUSD, wasReviewed, prLink });

  closeSessionDialog();
  renderAllAI();
}

function bindDialogCostPreview(overlay) {
  const tokInput = overlay.querySelector("#dlg-tokens-input");
  const modelSel = overlay.querySelector("#dlg-model-select");
  const preview  = overlay.querySelector("#dlg-cost-preview");
  if (!tokInput || !modelSel || !preview) return;

  function update() {
    const tokens = parseInt(tokInput.value, 10);
    const model  = modelSel.value;
    if (!tokens || tokens <= 0) { preview.textContent = ""; preview.classList.remove("has-value"); return; }
    const cost = estimateCost(tokens, model);
    preview.textContent = cost === 0 ? "Subscription tool — no per-token cost" : `Estimated cost: ${formatCost(cost)}`;
    preview.classList.toggle("has-value", cost > 0);
  }

  tokInput.addEventListener("input", update);
  modelSel.addEventListener("change", update);
}

function bindDialogAgentChange(overlay) {
  const agentSel = overlay.querySelector("#dlg-agent-select");
  const modelSel = overlay.querySelector("#dlg-model-select");
  if (!agentSel || !modelSel) return;
  agentSel.addEventListener("change", () => repopulateModelSelect(agentSel.value, modelSel));
}

// ── Log session modal ──────────────────────────────────────────────────────
function openLogDialog() {
  const overlay = document.getElementById("ai-log-overlay");
  if (!overlay) return;
  overlay.hidden = false;
  overlay.querySelector(".ai-dialog-box").focus();
  document.getElementById("ai-task-input")?.focus();
}

function closeLogDialog() {
  const overlay = document.getElementById("ai-log-overlay");
  if (!overlay) return;
  overlay.hidden = true;
  const form = document.getElementById("ai-log-form");
  if (form) form.reset();
  const agentSel = document.getElementById("ai-agent-select");
  if (agentSel) repopulateModelSelect(agentSel.value);
  const preview = document.getElementById("ai-cost-preview");
  if (preview) { preview.textContent = ""; preview.classList.remove("has-value"); }
}

// ── Render: session cards ──────────────────────────────────────────────────
function renderAISessions() {
  const list = document.getElementById("ai-sessions-list");
  if (!list) return;
  const today    = todayISO();
  const sessions = loadAIActivity().filter(s => s.date === today);

  if (!sessions.length) {
    list.innerHTML = `<li class="ai-empty">No AI sessions logged today — hit "+ Log session" to add one.</li>`;
    return;
  }

  list.innerHTML = sessions.map(s => {
    const agentLabel = AGENT_LABELS[s.agentName] || s.agentName;
    const badgeCls   = AGENT_BADGE_CLASS[s.agentName] || "";
    const tokStr     = s.tokensUsed ? `${s.tokensUsed.toLocaleString()} tokens` : null;
    const costStr    = s.costUSD > 0 ? formatCost(s.costUSD) : null;
    const reviewChip = s.wasReviewed
      ? `<span class="ai-meta-chip reviewed">✓ reviewed</span>`
      : `<span class="ai-meta-chip unreviewed">⚠ unreviewed</span>`;
    const prLink = s.prLink
      ? `<a class="ai-pr-link" href="${escapeHTML(s.prLink)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ PR/commit</a>`
      : "";

    const metaParts = [
      tokStr  ? `<span class="ai-meta-chip">${escapeHTML(tokStr)}</span>` : "",
      costStr ? `<span class="ai-meta-chip">${escapeHTML(costStr)}</span>` : "",
      reviewChip,
      prLink  ? `<span class="ai-meta-chip">${prLink}</span>` : "",
    ].filter(Boolean).join("");

    return `
      <li class="ai-session-card" data-session-id="${escapeHTML(s.id)}" tabindex="0"
          role="button" aria-label="View and edit session: ${escapeHTML(s.taskDesc)}">
        <span class="ai-agent-badge ${badgeCls}">${escapeHTML(agentLabel)}</span>
        <div class="ai-session-body">
          <div class="ai-session-task">${escapeHTML(s.taskDesc)}</div>
          <div class="ai-session-meta">${metaParts}</div>
        </div>
        <span class="ai-session-time">${escapeHTML(s.time)}</span>
      </li>`;
  }).join("");

  list.querySelectorAll(".ai-session-card[data-session-id]").forEach(card => {
    const id = card.dataset.sessionId;
    card.addEventListener("click", () => openSessionDialog(id));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSessionDialog(id); } });
  });
}

// ── Render: burn chart ─────────────────────────────────────────────────────
function renderAIBurnChart() {
  const container  = document.getElementById("ai-burn-chart");
  const weekLabel  = document.getElementById("ai-burn-week-label");
  if (!container) return;

  const sessions  = loadAIActivity();
  const burnData  = computeWeekBurn(sessions, _weekOffset);
  const { start, end } = getWeekRange(_weekOffset);
  if (weekLabel) {
    weekLabel.textContent = `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }

  renderBurnChart(container, burnData);

  // Bind prev/next only once — guard with a flag
  const prevBtn = document.getElementById("ai-burn-prev");
  const nextBtn = document.getElementById("ai-burn-next");
  if (prevBtn && !prevBtn._bound) {
    prevBtn._bound = true;
    prevBtn.addEventListener("click", () => { _weekOffset--; renderAIBurnChart(); });
  }
  if (nextBtn && !nextBtn._bound) {
    nextBtn._bound = true;
    nextBtn.addEventListener("click", () => {
      if (_weekOffset < 0) { _weekOffset++; renderAIBurnChart(); }
    });
  }
  // Disable next button when already on current week
  if (nextBtn) nextBtn.disabled = _weekOffset >= 0;
}

// ── Render: sprint review ──────────────────────────────────────────────────
function renderSprintReview() {
  const container = document.getElementById("ai-sprint-review");
  if (!container) return;

  const sessions = loadAIActivity();
  const total    = sessions.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="ai-section-heading-mono">Sprint review</div>
      <div class="ai-review-empty">No sessions logged yet — stats will appear here as you log AI usage.</div>`;
    return;
  }

  const sprintTokens = sessions.reduce((s, x) => s + (x.tokensUsed || 0), 0);
  const sprintCost   = sessions.reduce((s, x) => s + (x.costUSD    || 0), 0);
  const reviewed     = sessions.filter(s => s.wasReviewed).length;
  const reviewPct    = Math.round((reviewed / total) * 100);
  const avgTokens    = total > 0 && sprintTokens > 0
    ? Math.round(sprintTokens / sessions.filter(s => s.tokensUsed > 0).length)
    : 0;

  // Peak day
  const byDate = {};
  sessions.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + (s.tokensUsed || 0); });
  const peakEntry = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0];
  const peakDay   = peakEntry ? `${peakEntry[0]} (${peakEntry[1].toLocaleString()} tokens)` : "—";

  // Agent breakdown
  const agentCounts = {};
  sessions.forEach(s => { agentCounts[s.agentName] = (agentCounts[s.agentName] || 0) + 1; });
  const sortedAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]);
  const topAgent  = sortedAgents[0] ? AGENT_LABELS[sortedAgents[0][0]] || sortedAgents[0][0] : "—";

  // Model breakdown
  const modelCounts = {};
  sessions.forEach(s => { if (s.model) modelCounts[s.model] = (modelCounts[s.model] || 0) + 1; });
  const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
  const topModel  = sortedModels[0] ? sortedModels[0][0] : "—";

  const tokenStr  = sprintTokens >= 1000 ? `${(sprintTokens / 1000).toFixed(1)}k` : String(sprintTokens);
  const avgStr    = avgTokens >= 1000 ? `${(avgTokens / 1000).toFixed(1)}k` : (avgTokens > 0 ? String(avgTokens) : "—");

  const agentBreakdownHTML = sortedAgents.map(([key, count]) => {
    const label = AGENT_LABELS[key] || key;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="ai-review-breakdown-row">
        <span class="ai-review-breakdown-label">${escapeHTML(label)}</span>
        <div class="ai-review-breakdown-bar-track">
          <div class="ai-review-breakdown-bar" style="width:${pct}%"></div>
        </div>
        <span class="ai-review-breakdown-count">${count}</span>
      </div>`;
  }).join("");

  const modelBreakdownHTML = sortedModels.slice(0, 5).map(([model, count]) => `
    <div class="ai-review-model-row">
      <span class="ai-review-model-name">${escapeHTML(model)}</span>
      <span class="ai-review-model-count">${count}</span>
    </div>`).join("");

  container.innerHTML = `
    <div class="ai-section-heading-mono">Sprint review</div>
    <div class="ai-review-grid">

      <div class="ai-review-stat-group">
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Total sessions</div>
          <div class="ai-review-stat-value">${total}</div>
        </div>
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Total tokens</div>
          <div class="ai-review-stat-value">${escapeHTML(tokenStr)}</div>
        </div>
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Estimated cost</div>
          <div class="ai-review-stat-value">${escapeHTML(formatCost(sprintCost))}</div>
        </div>
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Avg tokens / session</div>
          <div class="ai-review-stat-value">${escapeHTML(avgStr)}</div>
        </div>
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Review rate</div>
          <div class="ai-review-stat-value ${reviewPct >= 80 ? "good" : reviewPct >= 50 ? "warn" : "alert"}">${reviewed}/${total} <span class="ai-review-stat-pct">(${reviewPct}%)</span></div>
        </div>
        <div class="ai-review-stat">
          <div class="ai-review-stat-label">Peak day</div>
          <div class="ai-review-stat-value ai-review-stat-value--sm">${escapeHTML(peakDay)}</div>
        </div>
      </div>

      <div class="ai-review-breakdowns">
        <div class="ai-review-breakdown-section">
          <div class="ai-review-breakdown-title">Agent usage <span class="ai-review-top-tag">top: ${escapeHTML(topAgent)}</span></div>
          ${agentBreakdownHTML}
        </div>
        <div class="ai-review-breakdown-section">
          <div class="ai-review-breakdown-title">Model usage <span class="ai-review-top-tag">top: ${escapeHTML(topModel)}</span></div>
          ${modelBreakdownHTML}
        </div>
      </div>

    </div>`;
}

// ── Cost preview (live, on token/model input) ──────────────────────────────
function bindCostPreview() {
  const tokenInput = document.getElementById("ai-tokens-input");
  const modelSel   = document.getElementById("ai-model-select");
  const preview    = document.getElementById("ai-cost-preview");
  if (!tokenInput || !modelSel || !preview) return;

  function update() {
    const tokens = parseInt(tokenInput.value, 10);
    const model  = modelSel.value;
    if (!tokens || tokens <= 0) { preview.textContent = ""; preview.classList.remove("has-value"); return; }
    const cost = estimateCost(tokens, model);
    preview.textContent = cost === 0
      ? "Subscription tool — no per-token cost"
      : `Estimated cost: ${formatCost(cost)}`;
    preview.classList.toggle("has-value", cost > 0);
  }

  tokenInput.addEventListener("input", update);
  modelSel.addEventListener("change", update);
}

// ── Log form: agent→model wiring ───────────────────────────────────────────
function bindAgentModelLink() {
  const agentSel = document.getElementById("ai-agent-select");
  const modelSel = document.getElementById("ai-model-select");
  if (!agentSel || !modelSel) return;

  repopulateModelSelect(agentSel.value, modelSel);

  agentSel.addEventListener("change", () => {
    repopulateModelSelect(agentSel.value, modelSel);
    document.getElementById("ai-tokens-input")?.dispatchEvent(new Event("input"));
  });
}

// ── Form submission ────────────────────────────────────────────────────────
function bindAILogForm() {
  const openBtn   = document.getElementById("ai-log-btn");
  const cancelBtn = document.getElementById("ai-log-cancel-btn");
  const form      = document.getElementById("ai-log-form");
  if (!form) return;

  if (openBtn) openBtn.addEventListener("click", openLogDialog);
  if (cancelBtn) cancelBtn.addEventListener("click", closeLogDialog);

  // Close via backdrop click on log overlay
  const logOverlay = document.getElementById("ai-log-overlay");
  if (logOverlay) {
    logOverlay.addEventListener("click", e => { if (e.target === logOverlay) closeLogDialog(); });
    logOverlay.querySelector(".ai-dialog-close")?.addEventListener("click", closeLogDialog);
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    const agentName   = document.getElementById("ai-agent-select").value;
    const model       = document.getElementById("ai-model-select").value;
    const taskDesc    = document.getElementById("ai-task-input").value.trim();
    const tokensRaw   = parseInt(document.getElementById("ai-tokens-input").value, 10);
    const tokensUsed  = isNaN(tokensRaw) ? 0 : tokensRaw;
    const wasReviewed = document.getElementById("ai-reviewed-check").checked;
    const prLink      = document.getElementById("ai-pr-input").value.trim();

    if (!taskDesc) return;

    const costUSD = estimateCost(tokensUsed, model);
    const session = {
      id: `ai_${Date.now()}`,
      date: todayISO(),
      time: nowTime(),
      agentName,
      model,
      taskDesc,
      tokensUsed,
      costUSD,
      wasReviewed,
      prLink,
    };

    saveAISession(session);
    closeLogDialog();
    renderAllAI();
  });
}

// ── Dialog bindings ────────────────────────────────────────────────────────
function bindSessionDialog() {
  const overlay = document.getElementById("ai-session-overlay");
  if (!overlay) return;

  overlay.querySelector(".ai-dialog-close")?.addEventListener("click", closeSessionDialog);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeSessionDialog(); });
  overlay.querySelector(".ai-dialog-save")?.addEventListener("click", handleSessionEdit);

  bindDialogAgentChange(overlay);
  bindDialogCostPreview(overlay);
}

// Close both dialogs on Escape
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  closeSessionDialog();
  closeLogDialog();
});

// ── Top-level render ───────────────────────────────────────────────────────
function renderAllAI() {
  renderAISessions();
  renderAIBurnChart();
  renderSprintReview();
}
