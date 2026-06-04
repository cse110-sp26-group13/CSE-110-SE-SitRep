/**
 * Settings page orchestrator ([settings.html](../../settings.html)).
 *
 *   - Hydrates the account section from the Supabase session + profiles row.
 *   - Display name reads/writes public.profiles.display_name
 *     (RLS: profile_self_update).
 *   - Theme buttons mirror the rail's theme-toggle through the same
 *     localStorage key as [theme.js](../theme.js).
 *   - Notification toggles persist to localStorage and feed the
 *     dashboard notification center.
 *   - Circles section: list / join / create teams; switching the active
 *     team reloads the page so the rest of the app re-hydrates.
 */

(function () {
  const NOTIFY_KEYS = {
    "notify-standup":  "sitrep-notify-standup",
    "notify-mentions": "sitrep-notify-mentions",
    "notify-digest":   "sitrep-notify-digest",
  };
  const THEME_KEY = "sitrep-theme";

  let currentUserId = null;
  let lastSavedName = "";

  /**
   * Populate the account section: email (read-only), display name
   * (editable), and the signed-in subline. Falls back through
   * profile → user_metadata → email-localpart when the profiles
   * row hasn't been backfilled yet. Wires up the display-name input
   * for change-on-blur saves.
   */
  async function loadAccount() {
    const emailEl  = document.getElementById("settings-email");
    const nameEl   = document.getElementById("settings-display-name");
    const subEl    = document.getElementById("settings-account-sub");
    const statusEl = document.getElementById("settings-name-status");

    try {
      const { data: { user } } = await window.sbClient.auth.getUser();
      if (!user) return;
      currentUserId = user.id;

      const email = user.email || "—";
      emailEl.textContent = email;
      subEl.textContent = `Signed in as ${email}`;

      const { data: profile, error } = await window.sbClient
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      const name = (profile && profile.display_name) ||
        (user.user_metadata && user.user_metadata.display_name) ||
        (user.email ? user.email.split("@")[0] : "");
      nameEl.value = name;
      lastSavedName = name;
    } catch (e) {
      console.error("[settings] failed to load account:", e);
      if (statusEl) statusEl.textContent = "Couldn't load profile.";
    }

    nameEl.addEventListener("change", () => saveDisplayName(nameEl, statusEl));
  }

  /**
   * Persist the display name change to public.profiles. Rejects empty
   * values (snapping back to the last-saved name) and surfaces server
   * errors in the inline status element.
   *
   * @param {HTMLInputElement} nameEl - the display-name input.
   * @param {HTMLElement} statusEl - inline status message element.
   */
  async function saveDisplayName(nameEl, statusEl) {
    if (!currentUserId) return;
    const next = nameEl.value.trim();
    if (next === lastSavedName) return;
    if (!next) {
      statusEl.textContent = "Display name can't be empty.";
      nameEl.value = lastSavedName;
      return;
    }

    nameEl.disabled = true;
    statusEl.textContent = "Saving…";
    try {
      const { error } = await window.sbClient
        .from("profiles")
        .update({ display_name: next })
        .eq("id", currentUserId);
      if (error) throw error;
      lastSavedName = next;
      statusEl.textContent = "Saved.";
      setTimeout(() => { if (statusEl.textContent === "Saved.") statusEl.textContent = ""; }, 1800);
    } catch (e) {
      console.error("[settings] failed to update display_name:", e);
      statusEl.textContent = "Couldn't save — try again.";
      nameEl.value = lastSavedName;
    } finally {
      nameEl.disabled = false;
    }
  }

  /**
   * Wire the "Sign out" button — clears the Supabase session and
   * sends the user back to splash. We always redirect even if signOut
   * throws so a stale session can't leave the user stuck on settings.
   */
  function bindSignOut() {
    document.getElementById("settings-signout").addEventListener("click", async () => {
      try {
        await window.sbClient.auth.signOut();
      } catch (e) {
        console.error("[settings] signOut failed:", e);
      }
      window.location.replace("splash.html");
    });
  }

  /**
   * Wire the change-password form: strength meter, show/hide toggles,
   * and submit. On submit we re-verify the current password before
   * calling updateUser so a hijacked session can't silently change the
   * password without knowing the existing one.
   */
  function bindPasswordForm() {
    const form    = document.getElementById("settings-password-form");
    const curEl   = document.getElementById("pw-current");
    const newEl   = document.getElementById("pw-new");
    const confEl  = document.getElementById("pw-confirm");
    const btn     = document.getElementById("pw-submit");
    const statusEl = document.getElementById("pw-status");

    const setStatus = (text, kind) => {
      statusEl.className = "settings-password-status" + (kind ? " " + kind : "");
      statusEl.textContent = text;
    };

    newEl.addEventListener("input", () => {
      window.PwStrength?.update("pw-new", newEl.value);
    });

    form.querySelectorAll(".pw-reveal-btn").forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", () => {
        const input = document.getElementById(toggleBtn.dataset.pwTarget);
        if (!input) return;
        const wasHidden = input.type === "password";
        input.type = wasHidden ? "text" : "password";
        toggleBtn.setAttribute("aria-pressed", String(wasHidden));
        toggleBtn.setAttribute("aria-label", wasHidden ? "Hide password" : "Show password");
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");

      const currentPw = curEl.value;
      const newPw     = newEl.value;
      const confirmPw = confEl.value;

      if (newPw.length < 8) {
        setStatus("New password must be at least 8 characters.", "error");
        return;
      }
      if (newPw !== confirmPw) {
        setStatus("New passwords don't match.", "error");
        return;
      }
      if (newPw === currentPw) {
        setStatus("New password must differ from the current one.", "error");
        return;
      }

      btn.disabled = true;
      setStatus("Updating…", "");
      try {
        const { data: { user } } = await window.sbClient.auth.getUser();
        if (!user || !user.email) {
          setStatus("No active session — please sign in again.", "error");
          return;
        }

        // Re-verify the current password before allowing the change.
        const { error: verifyErr } = await window.sbClient.auth.signInWithPassword({
          email: user.email,
          password: currentPw,
        });
        if (verifyErr) {
          setStatus("Current password is incorrect.", "error");
          return;
        }

        const { error: updateErr } = await window.sbClient.auth.updateUser({ password: newPw });
        if (updateErr) {
          if (/at least/i.test(updateErr.message || "")) {
            setStatus("Password is too weak — try a longer one.", "error");
          } else {
            setStatus("Couldn't update password — try again.", "error");
          }
          return;
        }

        form.reset();
        window.PwStrength?.update("pw-new", "");
        setStatus("Password updated.", "success");
      } catch (err) {
        console.error("[settings] password change failed:", err);
        setStatus("Something went wrong — try again.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  /**
   * Wire the Theme section — light/dark buttons set
   * `<html data-theme>` and persist to localStorage. Also mirrors
   * clicks on the rail's theme-toggle so the on-page buttons stay
   * in sync.
   */
  function bindTheme() {
    const wrap = document.getElementById("settings-theme");
    const railToggle = document.getElementById("theme-toggle");
    const sync = () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      wrap.dataset.active = current;
      wrap.querySelectorAll("button").forEach(b => {
        b.classList.toggle("on", b.dataset.theme === current);
      });
      if (railToggle) {
        railToggle.setAttribute("aria-pressed", String(current === "dark"));
      }
    };
    wrap.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        document.documentElement.dataset.theme = b.dataset.theme;
        localStorage.setItem(THEME_KEY, b.dataset.theme);
        sync();
      });
    });
    // The rail's existing toggle button also flips the theme; mirror it back.
    if (railToggle) railToggle.addEventListener("click", () => setTimeout(sync, 0));
    sync();
  }

  /**
   * Wire the notification toggles. The checked state round-trips
   * through localStorage so dashboard alerts can honor the user's
   * preferences without a server-side channel.
   */
  function bindNotifications() {
    Object.entries(NOTIFY_KEYS).forEach(([id, key]) => {
      const cb = document.getElementById(id);
      cb.checked = localStorage.getItem(key) !== "0";
      cb.addEventListener("change", () => {
        localStorage.setItem(key, cb.checked ? "1" : "0");
      });
    });
  }

  const ACTIVE_TEAM_KEY = "sitrep-active-team";

  /**
   * Local HTML escaper. Duplicated from utils.js because this page
   * doesn't include utils.js (settings doesn't depend on the
   * dashboard feature modules).
   *
   * @param {unknown} s
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 1–2 letter circle initials for the rail mark / list rows.
   *
   * @param {string} name
   * @returns {string}
   */
  function circleInitials(name) {
    const t = (name || "").trim();
    if (!t) return "?";
    return t.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  /**
   * Fetch every circle the signed-in user belongs to, with role info.
   * Same shape as the circle-switcher's fetchCircles() — kept separate
   * because this page may render before the rail's switcher has hydrated.
   *
   * @returns {Promise<Array<{id: string, name: string, joinCode: string, role: string}>>}
   */
  async function fetchCirclesForSettings() {
    // RLS exposes every membership row for any team you belong to, so
    // without scoping to the current user you also see teammates'
    // rows (and their roles) for shared teams.
    const { data: sess } = await window.sbClient.auth.getSession();
    const uid = sess && sess.session && sess.session.user && sess.session.user.id;
    if (!uid) return [];
    const { data, error } = await window.sbClient
      .from("memberships")
      .select("role, team_id, teams ( id, name, join_code )")
      .eq("user_id", uid)
      .order("joined_at", { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data
      .filter(r => r.teams)
      .map(r => ({ id: r.teams.id, name: r.teams.name, joinCode: r.teams.join_code, role: r.role }));
  }

  /**
   * Render the circles list — one button per membership, marking the
   * active one and showing each circle's join code. Clicking a
   * non-active circle stores its id and reloads so feature modules
   * pick up the new scope.
   *
   * @param {Array<{id: string, name: string, joinCode: string, role: string}>} list
   * @param {string|null} activeId
   */
  function renderCircles(list, activeId) {
    const ul = document.getElementById("circles-list");
    if (!ul) return;
    if (!list.length) {
      ul.innerHTML = `<li class="circles-empty">You haven't joined any circles yet.</li>`;
      return;
    }
    ul.innerHTML = list.map(c => `
      <li>
        <button type="button" class="circles-item ${c.id === activeId ? "active" : ""}" data-team-id="${c.id}">
          <span class="circles-item-mark">${circleInitials(c.name)}</span>
          <span class="circles-item-text">
            <span class="circles-item-name">${escapeHtml(c.name)}</span>
            <span class="circles-item-meta">${escapeHtml(c.role || "member")}</span>
          </span>
          <span class="circles-item-code">${escapeHtml(c.joinCode || "")}</span>
          <span class="circles-item-state">${c.id === activeId ? "Active" : "Set active"}</span>
        </button>
      </li>
    `).join("");
    ul.querySelectorAll(".circles-item").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.teamId;
        if (!id || id === activeId) return;
        localStorage.setItem(ACTIVE_TEAM_KEY, id);
        window.location.reload();
      });
    });
  }

  /**
   * Wire the Circles section: render the list, repair any stored
   * active-team id that no longer matches a membership, and bind the
   * Join + Create forms. Both forms re-fetch the list on success so
   * the UI reflects the new state without a reload.
   */
  async function bindCircles() {
    const list = document.getElementById("circles-list");
    if (!list) return;

    const refresh = async () => {
      const circles = await fetchCirclesForSettings();
      let active = localStorage.getItem(ACTIVE_TEAM_KEY);
      if (!circles.some(c => c.id === active)) {
        active = circles[0] ? circles[0].id : null;
        if (active) localStorage.setItem(ACTIVE_TEAM_KEY, active);
        else localStorage.removeItem(ACTIVE_TEAM_KEY);
      }
      renderCircles(circles, active);
    };

    await refresh();

    const joinForm   = document.getElementById("circles-join-form");
    const joinInput  = document.getElementById("circles-join-code");
    const joinStatus = document.getElementById("circles-join-status");
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = (joinInput.value || "").trim();
      joinStatus.textContent = "";
      if (!/^\d{6}$/.test(code)) {
        joinStatus.textContent = "Enter the 6-digit code.";
        return;
      }
      joinStatus.textContent = "Joining…";
      try {
        const { data, error } = await window.sbClient.rpc("join_team_by_code", { p_code: code });
        if (error) {
          const mapped = window.auth ? window.auth.mapAuthError(error, "join_team_by_code") : null;
          joinStatus.textContent = (mapped && mapped.message) || "Couldn't join that circle.";
          return;
        }
        if (data && data.id) localStorage.setItem(ACTIVE_TEAM_KEY, data.id);
        joinForm.reset();
        joinStatus.textContent = "Joined.";
        await refresh();
      } catch (err) {
        console.error("[settings] join failed:", err);
        joinStatus.textContent = "Something went wrong — try again.";
      }
    });

    const createForm   = document.getElementById("circles-create-form");
    const createInput  = document.getElementById("circles-create-name");
    const createStatus = document.getElementById("circles-create-status");
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (createInput.value || "").trim();
      createStatus.textContent = "";
      if (!name) {
        createStatus.textContent = "Please enter a circle name.";
        return;
      }
      createStatus.textContent = "Creating…";
      try {
        const { data, error } = await window.sbClient.rpc("create_team", { p_name: name });
        if (error) {
          const mapped = window.auth ? window.auth.mapAuthError(error, "create_team") : null;
          createStatus.textContent = (mapped && mapped.message) || "Couldn't create that circle.";
          return;
        }
        if (data && data.id) localStorage.setItem(ACTIVE_TEAM_KEY, data.id);
        createForm.reset();
        createStatus.textContent = "Created.";
        await refresh();
      } catch (err) {
        console.error("[settings] create failed:", err);
        createStatus.textContent = "Something went wrong — try again.";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    loadAccount();
    bindSignOut();
    bindPasswordForm();
    bindTheme();
    bindNotifications();
    bindCircles();
  });
})();
