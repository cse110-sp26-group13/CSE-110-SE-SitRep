/**
 * Light/dark theme controller.
 *
 * Loaded in `<head>` of every page so the persisted choice is applied
 * to `<html data-theme>` before first paint — no flash of wrong theme.
 * The rail's `#theme-toggle` button (in `<body>`) is wired up after
 * DOMContentLoaded since it isn't in the DOM yet when this runs.
 *
 * Storage key: `sitrep-theme` ("light" | "dark").
 * Default: light (cream paper). Dark is opt-in; we don't follow the
 * OS theme so a fresh visit is predictable.
 */

(function () {
  const KEY = "sitrep-theme";

  /**
   * Read the persisted theme.
   *
   * @returns {"light"|"dark"}
   */
  function resolve() {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  }

  /**
   * Apply a theme to `<html data-theme>`. CSS variables in
   * [css/base.css](../css/base.css) switch off this attribute.
   *
   * @param {"light"|"dark"} theme
   */
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
