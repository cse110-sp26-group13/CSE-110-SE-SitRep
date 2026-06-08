/**
 * @fileoverview AI Agents feature module.
 * Handles logging, rendering, cost-estimation, and session editing for AI agent sessions.
 * Follows the same pattern as checkins.js and activity.js.
 * Data is loaded from Supabase via db.loadAll() → window.aiSessions,
 * following the same pattern as teammates, blockers, and calendarEvents.
 * Mutations go through db.logAISession() and db.updateAISession() in db.js.
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
    { value: "claude-opus-4-8",  label: "Claude Opus 4.8"   },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5",  label: "Claude Haiku 4.5"  },
  ],
  "copilot": [
    { value: "copilot-gpt-5-5",           label: "GPT-5.5"           },
    { value: "copilot-gpt-5-4",           label: "GPT-5.4"           },
    { value: "copilot-gpt-5-4-mini",      label: "GPT-5.4 mini"      },
    { value: "copilot-claude-opus-4-8",   label: "Claude Opus 4.8"   },
    { value: "copilot-claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "copilot-claude-haiku-4-5",  label: "Claude Haiku 4.5"  },
    { value: "copilot-gemini-3-5-flash",  label: "Gemini 3.5 Flash"  },
    { value: "copilot-gemini-2-5-pro",    label: "Gemini 2.5 Pro"    },
  ],
  "cursor": [
    { value: "cursor-auto",               label: "Cursor Auto"              },
    { value: "cursor-composer-2-5",       label: "Composer 2.5"             },
    { value: "cursor-composer-2-5-fast",  label: "Composer 2.5 (Fast)"      },
    { value: "cursor-claude-opus-4-8",    label: "Claude Opus 4.8"          },
    { value: "cursor-claude-opus-4-7-fast", label: "Claude Opus 4.7 (fast mode)" },
    { value: "cursor-claude-sonnet-4-6",  label: "Claude Sonnet 4.6"        },
    { value: "cursor-claude-haiku-4-5",   label: "Claude Haiku 4.5"         },
    { value: "cursor-gpt-5-5",            label: "GPT-5.5"                  },
    { value: "cursor-gpt-5-4",            label: "GPT-5.4"                  },
    { value: "cursor-gpt-5-4-mini",       label: "GPT-5.4 mini"             },
    { value: "cursor-gemini-3-5-flash",   label: "Gemini 3.5 Flash"         },
    { value: "cursor-gemini-3-1-pro",     label: "Gemini 3.1 Pro"           },
    { value: "cursor-gemini-3-flash",     label: "Gemini 3 Flash"           },
    { value: "cursor-grok-4-20",          label: "Grok 4.20"                },
  ],
  "chatgpt": [
    { value: "gpt-5-5",      label: "GPT-5.5"      },
    { value: "gpt-5-4",      label: "GPT-5.4"      },
    { value: "gpt-5-4-mini", label: "GPT-5.4 mini" },
  ],
  "gemini": [
    { value: "gemini-3-5-flash",     label: "Gemini 3.5 Flash"    },
    { value: "gemini-3-1-pro",       label: "Gemini 3.1 Pro"      },
    { value: "gemini-3-flash",       label: "Gemini 3 Flash"      },
    { value: "gemini-3-1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
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
  // Claude Code
  "claude-opus-4-8":            { input: 5.00,  output: 25.00 },
  "claude-sonnet-4-6":          { input: 3.00,  output: 15.00 },
  "claude-haiku-4-5":           { input: 1.00,  output: 5.00  },
  // ChatGPT
  "gpt-5-5":                    { input: 5.00,  output: 30.00 },
  "gpt-5-4":                    { input: 2.50,  output: 15.00 },
  "gpt-5-4-mini":               { input: 0.75,  output: 4.50  },
  // Gemini (standalone)
  "gemini-3-5-flash":           { input: 1.50,  output: 9.00  },
  "gemini-3-1-pro":             { input: 2.00,  output: 12.00 },
  "gemini-3-flash":             { input: 0.50,  output: 3.00  },
  "gemini-3-1-flash-lite":      { input: 0.10,  output: 0.40  },
  // Cursor — native models
  "cursor-auto":                { input: 1.25,  output: 6.00  },
  "cursor-composer-2-5":        { input: 0.50,  output: 2.50  },
  "cursor-composer-2-5-fast":   { input: 3.00,  output: 15.00 },
  // Cursor — Claude via API pool
  "cursor-claude-opus-4-8":     { input: 5.00,  output: 25.00 },
  "cursor-claude-opus-4-7-fast":{ input: 30.00, output: 150.00},
  "cursor-claude-sonnet-4-6":   { input: 3.00,  output: 15.00 },
  "cursor-claude-haiku-4-5":    { input: 1.00,  output: 5.00  },
  // Cursor — OpenAI via API pool
  "cursor-gpt-5-5":             { input: 5.00,  output: 30.00 },
  "cursor-gpt-5-4":             { input: 2.50,  output: 15.00 },
  "cursor-gpt-5-4-mini":        { input: 0.75,  output: 4.50  },
  // Cursor — Gemini via API pool
  "cursor-gemini-3-5-flash":    { input: 1.50,  output: 9.00  },
  "cursor-gemini-3-1-pro":      { input: 2.00,  output: 12.00 },
  "cursor-gemini-3-flash":      { input: 0.50,  output: 3.00  },
  // Cursor — xAI via API pool
  "cursor-grok-4-20":           { input: 2.00,  output: 6.00  },
  // Copilot — subscription, no per-token cost
  "copilot-gpt-5-5":            { input: 0, output: 0 },
  "copilot-gpt-5-4":            { input: 0, output: 0 },
  "copilot-gpt-5-4-mini":       { input: 0, output: 0 },
  "copilot-claude-opus-4-8":    { input: 0, output: 0 },
  "copilot-claude-sonnet-4-6":  { input: 0, output: 0 },
  "copilot-claude-haiku-4-5":   { input: 0, output: 0 },
  "copilot-gemini-3-5-flash":   { input: 0, output: 0 },
  "copilot-gemini-2-5-pro":     { input: 0, output: 0 },
  // Other
  "other":                      { input: 0, output: 0 },
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
  "gemini":      "gemini",   // styled in css/ai-agents.css (.ai-agent-badge.gemini)
  "other":       "other",
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
 * Formats a token count as a human-readable string.
 * < 1,000 → "847"   ·   1k–999k → "42.3k"   ·   1M+ → "1.5M"
 * @param {number} n - Token count.
 * @returns {string}
 */
function formatTokens(n) {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
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
    const tokLabel = tokens > 0 ? formatTokens(tokens) : "";
    const barMod = isEmpty ? "ai-burn-bar--empty" : (isToday ? "ai-burn-bar--today" : "");
    const wrapMod = isToday ? "ai-burn-bar-wrap--today" : "";
    return `
      <div class="ai-burn-bar-wrap ${wrapMod}" title="${date}: ${formatTokens(tokens)} (${tokens.toLocaleString()}) tokens">
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

/**
 * Returns the current team's AI sessions from the db.loadAll() global.
 * @returns {Array<Object>}
 */
function loadAIActivity() {
  return window.aiSessions || [];
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

async function handleSessionEdit() {
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
  try {
    await db.updateAISession(_activeSessionId, { agentName, model, taskDesc, tokensUsed, costUSD, wasReviewed, prLink });
    closeSessionDialog();
    await db.loadAll();
    renderAllAI();
  } catch (err) {
    console.error("[ai-agents] failed to update session:", err);
  }
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
    const tokStr     = s.tokensUsed ? `${formatTokens(s.tokensUsed)} tokens` : null;
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
  const peakDay   = peakEntry ? `${peakEntry[0]} (${formatTokens(peakEntry[1])})` : "—";

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

  const tokenStr  = formatTokens(sprintTokens);
  const avgStr    = avgTokens > 0 ? formatTokens(avgTokens) : "—";

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
  const cancelBtn = document.getElementById("ai-cancel-btn");
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

  form.addEventListener("submit", async e => {
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
    try {
      await db.logAISession({ date: todayISO(), agentName, model, taskDesc, tokensUsed, costUSD, wasReviewed, prLink });
      closeLogDialog();
      await db.loadAll();
      renderAllAI();
    } catch (err) {
      console.error("[ai-agents] failed to log session:", err);
    }
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

// ── KPI strip (AI agents page) ─────────────────────────────────────────────
function renderAIKPIs() {
  const host = document.getElementById("ai-kpis");
  if (!host) return;
  const { todayCount, sprintTokens, sprintCost, reviewRate } = aiKPIData();
  const tiles = [
    { label: "Sessions today",  value: todayCount,
      cls: todayCount > 0 ? "good" : "",
      sub: todayCount === 0 ? "None logged yet" : "Logged today" },
    { label: "Sprint tokens",   value: sprintTokens.toLocaleString(),
      cls: "",
      sub: "Total this sprint" },
    { label: "Sprint cost",     value: `$${sprintCost.toFixed(2)}`,
      cls: "",
      sub: "Estimated spend" },
    { label: "Review rate",     value: reviewRate,
      cls: reviewRate === "—" ? "" : "good",
      sub: "Human-reviewed" },
  ];
  host.innerHTML = tiles.map(t => `
    <div class="kpi">
      <div class="kpi-label">${t.label}</div>
      <div class="kpi-value ${t.cls || ""}">${t.value}</div>
      <div class="kpi-trend">${t.sub}</div>
    </div>
  `).join("");
}

// ── Top-level render ───────────────────────────────────────────────────────
function renderAllAI() {
  renderAIKPIs();
  renderAISessions();
  renderAIBurnChart();
  renderSprintReview();
}
