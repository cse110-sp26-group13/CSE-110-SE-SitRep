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
 * Update model labels/values here as new models are released.
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
 * Update these as model pricing changes alongside AGENT_MODELS.
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

// ── Cost estimation ────────────────────────────────────────────────────────
/**
 * Estimates the USD cost for a session given token count and model.
 * Assumes a 70/30 input/output token split when only a total is provided.
 * @param {number} tokens - Total tokens used in the session.
 * @param {string} model  - Model key from MODEL_RATES.
 * @returns {number} Estimated cost in USD.
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
 * @param {number} cost - USD cost value.
 * @returns {string} E.g. "~$0.04" or "—" for subscription tools.
 */
function formatCost(cost) {
  if (cost === 0) return "—";
  if (cost < 0.01) return `~$${cost.toFixed(4)}`;
  return `~$${cost.toFixed(2)}`;
}

// ── Sprint burn chart ──────────────────────────────────────────────────────
/**
 * Groups sessions by date and sums tokens per day.
 * @param {Array<Object>} sessions - Array of ai session objects.
 * @returns {Array<{date: string, tokens: number}>} Sorted oldest-first, last 14 days.
 */
function computeSprintBurn(sessions) {
  const byDate = {};
  sessions.forEach(s => {
    const d = s.date || "unknown";
    byDate[d] = (byDate[d] || 0) + (s.tokensUsed || 0);
  });
  return Object.entries(byDate)
    .map(([date, tokens]) => ({ date, tokens }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

/**
 * Renders the sprint token burn bar chart into the given container.
 * Each bar represents one day's total tokens, with a count label above it.
 * Bars are sized relative to the peak day. Hover for exact count.
 * Uses pure DOM — no external charting library.
 * @param {HTMLElement} container - The `.ai-burn-chart` element.
 * @param {Array<{date: string, tokens: number}>} burnData - From computeSprintBurn().
 */
function renderBurnChart(container, burnData) {
  // Filter to only days that have actual token data
  const daysWithTokens = burnData.filter(d => d.tokens > 0);

  if (!daysWithTokens.length) {
    container.innerHTML = `
      <div class="ai-burn-empty">
        No token data yet — log a session with a token count and it'll appear here.
      </div>`;
    return;
  }

  const maxTokens = Math.max(...daysWithTokens.map(d => d.tokens), 1);
  container.innerHTML = daysWithTokens.map(({ date, tokens }) => {
    const pct      = Math.max(Math.round((tokens / maxTokens) * 100), 4); // min 4% so bar is always visible
    const label    = date.slice(5); // "MM-DD"
    const tokLabel = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
    return `
      <div class="ai-burn-bar-wrap" title="${date}: ${tokens.toLocaleString()} tokens">
        <div class="ai-burn-count">${escapeHTML(tokLabel)}</div>
        <div class="ai-burn-bar" style="height:${pct}%" aria-label="${escapeHTML(tokLabel)} tokens on ${escapeHTML(date)}"></div>
        <div class="ai-burn-day">${escapeHTML(label)}</div>
      </div>`;
  }).join("");
}

// ── State helpers ──────────────────────────────────────────────────────────
/**
 * Returns today's date as a YYYY-MM-DD string.
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Loads all AI sessions from state (localStorage).
 * Integration point: replace with Supabase fetch when table is ready.
 * @returns {Array<Object>}
 */
function loadAIActivity() {
  return state.aiSessions || [];
}

/**
 * Saves a new AI session entry to state.
 * Integration point: also insert to Supabase `ai_activity` table here.
 * @param {Object} session - Session object to persist.
 */
function saveAISession(session) {
  if (!state.aiSessions) state.aiSessions = [];
  state.aiSessions.unshift(session);
  saveState();
}

/**
 * Updates an existing AI session in state by id.
 * @param {string} id    - Session id to update.
 * @param {Object} patch - Fields to merge into the existing session.
 */
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
 * @returns {{todayCount: number, sprintTokens: number, sprintCost: number, reviewRate: string}}
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
/**
 * Repopulates the model <select> with options for the given agent.
 * Called on agent select change and on initial page load.
 * @param {string} agentKey - Key from AGENT_MODELS.
 * @param {HTMLSelectElement} [selectEl] - Defaults to #ai-model-select.
 * @param {string} [currentValue] - If provided, tries to re-select this value.
 */
function repopulateModelSelect(agentKey, selectEl, currentValue) {
  const sel = selectEl || document.getElementById("ai-model-select");
  if (!sel) return;
  const models = AGENT_MODELS[agentKey] || AGENT_MODELS["other"];
  sel.innerHTML = models.map(m =>
    `<option value="${escapeHTML(m.value)}"${m.value === currentValue ? " selected" : ""}>${escapeHTML(m.label)}</option>`
  ).join("");
}

// ── Session detail / edit dialog ───────────────────────────────────────────
/** Currently-open session id (for the edit dialog). @type {string|null} */
let _activeSessionId = null;

/**
 * Opens the session detail modal for the given session id.
 * Populates all fields with current session data.
 * @param {string} sessionId
 */
function openSessionDialog(sessionId) {
  const session = loadAIActivity().find(s => s.id === sessionId);
  if (!session) return;
  _activeSessionId = sessionId;

  const overlay = document.getElementById("ai-session-overlay");
  if (!overlay) return;

  // Populate read-only header
  const agentLabel = AGENT_LABELS[session.agentName] || session.agentName;
  overlay.querySelector(".ai-dialog-agent-label").textContent = agentLabel;
  overlay.querySelector(".ai-dialog-time").textContent        = `${session.date} · ${session.time}`;

  // Populate edit fields
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

  // Show current cost
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

/**
 * Closes the session detail modal and resets state.
 */
function closeSessionDialog() {
  const overlay = document.getElementById("ai-session-overlay");
  if (overlay) overlay.hidden = true;
  _activeSessionId = null;
}

/**
 * Saves edits from the dialog form, updates state, and re-renders.
 */
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

/**
 * Wires up dialog-internal cost preview (mirrors the main form's preview).
 * @param {HTMLElement} overlay
 */
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

/**
 * Wires up dialog-internal agent→model repopulation.
 * @param {HTMLElement} overlay
 */
function bindDialogAgentChange(overlay) {
  const agentSel = overlay.querySelector("#dlg-agent-select");
  const modelSel = overlay.querySelector("#dlg-model-select");
  if (!agentSel || !modelSel) return;
  agentSel.addEventListener("change", () => repopulateModelSelect(agentSel.value, modelSel));
}

// ── Render: page-local AI KPI row ─────────────────────────────────────────
/**
 * Renders the KPI summary row at the top of the AI Agents page.
 */
function renderAIKPIs() {
  const el = document.getElementById("ai-kpis");
  if (!el) return;
  const { todayCount, sprintTokens, sprintCost, reviewRate } = aiKPIData();
  const tokenStr = sprintTokens >= 1000 ? `${(sprintTokens / 1000).toFixed(1)}k` : sprintTokens;
  const costStr  = formatCost(sprintCost);

  const tiles = [
    { label: "Sessions today",   value: todayCount, sub: "AI interactions logged",  cls: todayCount > 0 ? "good" : "" },
    { label: "Sprint tokens",    value: tokenStr,   sub: "Cumulative this sprint",  cls: "" },
    { label: "Est. sprint cost", value: costStr,    sub: "Based on model pricing",  cls: "" },
    { label: "Review rate",      value: reviewRate, sub: "Human-reviewed sessions", cls: "" },
  ];

  el.innerHTML = tiles.map(t => `
    <div class="ai-kpi">
      <div class="ai-kpi-label">${t.label}</div>
      <div class="ai-kpi-value ${t.cls || ""}">${t.value}</div>
      <div class="ai-kpi-sub">${t.sub}</div>
    </div>
  `).join("");
}

// ── Render: session cards ──────────────────────────────────────────────────
/**
 * Renders today's AI session cards into the sessions list.
 * Each card is clickable and opens the session detail/edit dialog.
 */
function renderAISessions() {
  const list = document.getElementById("ai-sessions-list");
  if (!list) return;
  const today    = todayISO();
  const sessions = loadAIActivity().filter(s => s.date === today);

  if (!sessions.length) {
    list.innerHTML = `<li class="ai-empty">No AI sessions logged today. Use the form above to add one.</li>`;
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

  // Bind click + keyboard open for each card
  list.querySelectorAll(".ai-session-card[data-session-id]").forEach(card => {
    const id = card.dataset.sessionId;
    card.addEventListener("click", () => openSessionDialog(id));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSessionDialog(id); } });
  });
}

// ── Render: burn chart ─────────────────────────────────────────────────────
/**
 * Renders the sprint token burn chart.
 */
function renderAIBurnChart() {
  const container = document.getElementById("ai-burn-chart");
  if (!container) return;
  const sessions = loadAIActivity();
  const burnData = computeSprintBurn(sessions);
  renderBurnChart(container, burnData);
}

// ── Cost preview (live, on token/model input) ──────────────────────────────
/**
 * Wires up the live cost preview for the log-session form.
 */
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
/**
 * Wires up the agent select → model select repopulation on the log form.
 */
function bindAgentModelLink() {
  const agentSel = document.getElementById("ai-agent-select");
  const modelSel = document.getElementById("ai-model-select");
  if (!agentSel || !modelSel) return;

  // Populate immediately with the default agent
  repopulateModelSelect(agentSel.value, modelSel);

  agentSel.addEventListener("change", () => {
    repopulateModelSelect(agentSel.value, modelSel);
    // Re-run cost preview since model changed
    document.getElementById("ai-tokens-input")?.dispatchEvent(new Event("input"));
  });
}

// ── Form submission ────────────────────────────────────────────────────────
/**
 * Handles the "Log Session" form submission.
 */
function bindAILogForm() {
  const form      = document.getElementById("ai-log-form");
  const openBtn   = document.getElementById("ai-log-btn");
  const cancelBtn = document.getElementById("ai-cancel-btn");
  if (!form) return;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      form.hidden = false;
      document.getElementById("ai-task-input")?.focus();
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      form.hidden = true;
      form.reset();
      // Re-populate model select to match the reset agent value
      const agentSel = document.getElementById("ai-agent-select");
      if (agentSel) repopulateModelSelect(agentSel.value);
    });
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

    pushActivity({
      type: "ai",
      who:  "You",
      text: `logged ${AGENT_LABELS[agentName] || agentName} session — ${taskDesc.slice(0, 60)}${taskDesc.length > 60 ? "…" : ""}`,
    });

    form.hidden = true;
    form.reset();
    repopulateModelSelect(document.getElementById("ai-agent-select")?.value || "claude-code");

    const preview = document.getElementById("ai-cost-preview");
    if (preview) { preview.textContent = ""; preview.classList.remove("has-value"); }

    renderAllAI();
  });
}

// ── Dialog bindings ────────────────────────────────────────────────────────
/**
 * Wires up the session detail/edit overlay: close button, Escape key,
 * backdrop click, agent→model repopulation, cost preview, and save.
 */
function bindSessionDialog() {
  const overlay = document.getElementById("ai-session-overlay");
  if (!overlay) return;

  // Close via × button
  overlay.querySelector(".ai-dialog-close")?.addEventListener("click", closeSessionDialog);

  // Close via Escape
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSessionDialog(); });

  // Close via backdrop click (but not if clicking inside the box)
  overlay.addEventListener("click", e => { if (e.target === overlay) closeSessionDialog(); });

  // Save edit
  overlay.querySelector(".ai-dialog-save")?.addEventListener("click", handleSessionEdit);

  // Agent→model inside dialog
  bindDialogAgentChange(overlay);

  // Cost preview inside dialog
  bindDialogCostPreview(overlay);
}

// ── Top-level render ───────────────────────────────────────────────────────
/**
 * Re-renders all AI Agents page components.
 * Call this after any state change.
 */
function renderAllAI() {
  renderAIKPIs();
  renderAISessions();
  renderAIBurnChart();
}
