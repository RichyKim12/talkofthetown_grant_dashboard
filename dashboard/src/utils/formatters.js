/* ============================================================
   FORMATTERS
   Small, dependency-free formatting helpers shared across screens.
   ============================================================ */

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  return `${min} minute${min === 1 ? "" : "s"} ago`;
}

export function daysUntil(iso, fromDate = new Date()) {
  return Math.ceil((new Date(iso) - fromDate) / (1000 * 60 * 60 * 24));
}
