// Light/dark theme. Loaded in <head> so the stored choice is applied to
// <html> before first paint (no flash). Toggle lives at the bottom of the
// rail; wiring waits for the DOM since the button is in <body>.

(function () {
  const KEY = "sitrep-theme";

  function resolve() {
    // Default to the canonical light (cream paper) theme; dark is opt-in so a
    // fresh load is predictable and never surprises with an OS-driven theme.
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
  }

  // Run immediately (head) to avoid a flash of the wrong theme.
  apply(resolve());

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const sync = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      btn.setAttribute("aria-pressed", String(dark));
      btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
    };

    btn.addEventListener("click", () => {
      const next =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      localStorage.setItem(KEY, next);
      sync();
    });

    sync();
  });
})();
