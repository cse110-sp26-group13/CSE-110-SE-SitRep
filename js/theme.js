// Light/dark theme. Loaded in <head> so the stored choice is applied to
// <html> before first paint (no flash). Toggle lives at the bottom of the
// rail; wiring waits for the DOM since the button is in <body>.

(function () {
  const KEY = "sitrep-theme";

  function resolve() {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
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
