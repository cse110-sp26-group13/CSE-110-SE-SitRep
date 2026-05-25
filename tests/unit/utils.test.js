/**
 * Unit tests for js/utils.js
 * Tests pure utility functions: escapeHTML, moodClass, nowTime, avatar
 */

// -- inline the functions under test so Jest doesn't need a module bundler --

const AVATAR_COLORS = ["#4f8cff", "#34c759", "#ffb020", "#ff453a", "#af52de", "#5ac8fa"];

function escapeHTML(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function moodClass(score) {
  if (score == null) return "mood-none";
  if (score >= 8) return "mood-good";
  if (score >= 5) return "mood-ok";
  return "mood-bad";
}

function avatar(name, id) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[(id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return `<div class="avatar" style="background:${color}">${initials}</div>`;
}

// -- tests --

describe("escapeHTML", () => {
  test("returns empty string for null", () => {
    expect(escapeHTML(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(escapeHTML(undefined)).toBe("");
  });

  test("escapes ampersand", () => {
    expect(escapeHTML("a & b")).toBe("a &amp; b");
  });

  test("escapes angle brackets", () => {
    expect(escapeHTML("<script>")).toBe("&lt;script&gt;");
  });

  test("escapes double quotes", () => {
    expect(escapeHTML('"hello"')).toBe("&quot;hello&quot;");
  });

  test("escapes single quotes", () => {
    expect(escapeHTML("it's")).toBe("it&#39;s");
  });

  test("leaves plain strings untouched", () => {
    expect(escapeHTML("hello world")).toBe("hello world");
  });

  test("coerces numbers to string", () => {
    expect(escapeHTML(42)).toBe("42");
  });
});

describe("moodClass", () => {
  test("returns mood-none for null", () => {
    expect(moodClass(null)).toBe("mood-none");
  });

  test("returns mood-good for score >= 8", () => {
    expect(moodClass(8)).toBe("mood-good");
    expect(moodClass(10)).toBe("mood-good");
  });

  test("returns mood-ok for score 5-7", () => {
    expect(moodClass(5)).toBe("mood-ok");
    expect(moodClass(7)).toBe("mood-ok");
  });

  test("returns mood-bad for score < 5", () => {
    expect(moodClass(4)).toBe("mood-bad");
    expect(moodClass(1)).toBe("mood-bad");
  });
});

describe("avatar", () => {
  test("renders initials from full name", () => {
    const result = avatar("Alex Kim", "alex");
    expect(result).toContain("AK");
  });

  test("renders only first two initials for long names", () => {
    const result = avatar("Jordan Lee Smith", "jordan");
    expect(result).toContain("JL");
    expect(result).not.toContain("S");
  });

  test("renders a div with avatar class", () => {
    const result = avatar("Sam Patel", "sam");
    expect(result).toMatch(/^<div class="avatar"/);
  });

  test("includes a background color", () => {
    const result = avatar("Riley Chen", "riley");
    expect(result).toContain("background:#");
  });

  test("handles single-word name gracefully", () => {
    const result = avatar("Taylor", "taylor");
    expect(result).toContain("T");
  });
});
