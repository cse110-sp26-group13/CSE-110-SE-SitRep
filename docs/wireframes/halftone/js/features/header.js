function renderHeader() {
  const date = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric"
  });
  document.getElementById("header-sub").textContent = `${date} · ${team.name}`;
}
