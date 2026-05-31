const AVATAR_COLORS = ["#4f8cff", "#34c759", "#ffb020", "#ff453a", "#af52de", "#5ac8fa"];

function escapeHTML(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
