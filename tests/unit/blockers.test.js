/**
 * Unit tests for blocker/selector logic from js/features/blockers.js
 * and js/selectors.js — pure functions only, no DOM required.
 */

// -- inline functions under test --

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };

function statusMatchesFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "open") return status === "open" || status === "in-progress";
  if (filter === "resolved") return status === "resolved";
  return true;
}

function overlapClass(count, total) {
  if (count === total) return "all";
  if (count >= total - 1) return "most";
  if (count * 2 >= total) return "some";
  if (count === 0) return "none";
  return "few";
}

// -- tests --

describe("statusMatchesFilter", () => {
  test("filter 'all' matches any status", () => {
    expect(statusMatchesFilter("open", "all")).toBe(true);
    expect(statusMatchesFilter("resolved", "all")).toBe(true);
    expect(statusMatchesFilter("in-progress", "all")).toBe(true);
  });

  test("filter 'open' matches open and in-progress", () => {
    expect(statusMatchesFilter("open", "open")).toBe(true);
    expect(statusMatchesFilter("in-progress", "open")).toBe(true);
  });

  test("filter 'open' does not match resolved", () => {
    expect(statusMatchesFilter("resolved", "open")).toBe(false);
  });

  test("filter 'resolved' matches only resolved", () => {
    expect(statusMatchesFilter("resolved", "resolved")).toBe(true);
    expect(statusMatchesFilter("open", "resolved")).toBe(false);
    expect(statusMatchesFilter("in-progress", "resolved")).toBe(false);
  });
});

describe("overlapClass", () => {
  test("returns 'all' when everyone is available", () => {
    expect(overlapClass(5, 5)).toBe("all");
  });

  test("returns 'most' when one person is missing", () => {
    expect(overlapClass(4, 5)).toBe("most");
  });

  test("returns 'some' when exactly half are available", () => {
    expect(overlapClass(3, 6)).toBe("some");
  });

  test("returns 'none' when nobody is available", () => {
    expect(overlapClass(0, 5)).toBe("none");
  });

  test("returns 'few' for low but nonzero overlap", () => {
    expect(overlapClass(1, 5)).toBe("few");
  });
});

describe("SEVERITY_ORDER", () => {
  test("critical sorts before high", () => {
    expect(SEVERITY_ORDER.critical).toBeLessThan(SEVERITY_ORDER.high);
  });

  test("high sorts before medium", () => {
    expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.medium);
  });
});
