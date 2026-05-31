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
