// Shared sidebar behavior, loaded on every dashboard page (after data.js,
// state.js, selectors.js so the data globals exist; runs at parse time,
// scripts are at end of <body> so the rail DOM is present):
//   • active-state on the current nav item (from <body data-page>)
//   • Standup + Issues counts from local data
//   • signed-in user in the foot + sign-out

(function () {
  const page = document.body && document.body.dataset && document.body.dataset.page;
  if (page) {
    document.querySelectorAll(".nav-item[data-route]").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === page);
    });
  }

  function setCount(id, txt) {
    const el = document.getElementById(id);
    if (el) { el.textContent = txt; el.hidden = false; }
  }

  // Nav counts from local data (data.js + state).
  try {
    if (typeof effectiveTeammates === "function") {
      const tm = effectiveTeammates();
      const checkedIn = tm.filter((t) => t.lastCheckIn).length;
      setCount("nav-count-standup", `${checkedIn}/${tm.length}`);
    }
    if (typeof effectiveBlockers === "function") {
      const open = effectiveBlockers().filter((b) => b.status !== "resolved").length;
      setCount("nav-count-issues", String(open));
    }
  } catch (_) { /* state not ready — leave placeholders */ }

  // Signed-in user in the foot (async; best-effort).
  if (window.sbClient && window.sbClient.auth) {
    window.sbClient.auth.getSession().then(({ data }) => {
      const email = data && data.session && data.session.user && data.session.user.email;
      if (!email) return;
      const nameEl = document.getElementById("rail-user-name");
      const avEl = document.getElementById("rail-user-avatar");
      if (nameEl) nameEl.textContent = email.split("@")[0];
      if (avEl) avEl.textContent = email.slice(0, 2).toUpperCase();
    }).catch(() => { /* ignore */ });

    const signout = document.getElementById("rail-signout");
    if (signout) {
      signout.addEventListener("click", async () => {
        try { await window.sbClient.auth.signOut(); } catch (_) { /* ignore */ }
        window.location.href = "splash.html";
      });
    }
  }
})();
