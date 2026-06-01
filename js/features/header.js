/**
 * Page header — paints today's date and the active circle name into
 * `#header-sub`. Shared by every page; no-op if the header element
 * isn't on the current page.
 */

/**
 * Render the header subline (date · circle name) and subscribe to
 * `sitrep:active-team` so a circle switch re-paints without a
 * full re-render. The listener is added once per call — fine in
 * practice because each page calls renderHeader() exactly once.
 */
function renderHeader() {
  const date = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric"
  });
  const el = document.getElementById("header-sub");
  if (!el) return;

  const paint = () => {
    const active = window.activeCircle && window.activeCircle.get();
    const name = (active && active.name) || (typeof team !== "undefined" ? team.name : "");
    el.textContent = name ? `${date} · ${name}` : date;
  };
  paint();
  // The circle-switcher hydrates async; re-paint when it settles or changes.
  window.addEventListener("sitrep:active-team", paint);
}
