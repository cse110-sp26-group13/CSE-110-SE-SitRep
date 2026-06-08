// Shared rail-nav active-state. Each page's <body data-page="..."> picks the
// matching rail anchor. Loaded on every page; no-op when neither is present.

(function () {
  const page = document.body?.dataset?.page;
  if (!page) return;
  document.querySelectorAll(".rail-icon[data-route]").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === page);
  });
})();
