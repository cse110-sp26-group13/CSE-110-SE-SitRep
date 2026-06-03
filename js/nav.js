/**
 * Shared rail-nav active-state.
 *
 * Each page declares its identity via `<body data-page="dashboard">`,
 * `<body data-page="issues">`, etc. This script looks up the matching
 * `.rail-icon[data-route="..."]` and adds the `active` class so the
 * current page's icon is highlighted.
 *
 * Loaded on every page via index.html and friends; no-op when the
 * page hasn't declared a `data-page` or when no rail is on the page.
 */

(function () {
  const page = document.body?.dataset?.page;
  if (!page) return;
  document.querySelectorAll(".rail-icon[data-route]").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === page);
  });
})();
