/**
 * Result helpers shared by both dashboards. Pure functions — no Firebase, no
 * page — so they are easy to change and test.
 */
import { getTool } from "./toolRegistry.js";

export function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

/** Milliseconds since 1970 for a result (newest-first sorting). */
export function recordTime(r = {}) {
  const c = r.createdAt;
  if (c && typeof c.toMillis === "function") { try { return c.toMillis(); } catch { /* ignore */ } }
  if (c && typeof c.seconds === "number") return c.seconds * 1000;
  const t = r.createdAtClient ? Date.parse(r.createdAtClient) : NaN;
  return Number.isFinite(t) ? t : 0;
}

export function formatDate(t) {
  if (!t) return "—";
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** One tidy shape for a result, whatever wrote it. */
export function normaliseResult(r = {}) {
  const total = num(r.total);
  const score = num(r.score);
  const percent = r.percent != null ? num(r.percent) : (total ? Math.round((score / total) * 100) : 0);
  const tool = getTool(r.toolId);
  const time = recordTime(r);
  return {
    id: r.id || null,
    studentCode: r.studentCode || "",
    studentName: r.studentName || "",
    className: r.className || "",
    toolId: r.toolId || "other",
    tool: tool ? tool.title : (r.toolTitle || r.toolId || "Activity"),
    topic: r.topic || (tool && tool.topic) || "",
    score, total, percent,
    time,
    dateLabel: formatDate(time),
  };
}

/** Attempts, average and best over a list of results. */
export function summarise(records = []) {
  const n = records.length;
  const avg = n ? Math.round(records.reduce((a, r) => a + num(r.percent), 0) / n) : 0;
  const best = records.reduce((m, r) => Math.max(m, num(r.percent)), 0);
  return { attempts: n, averagePercent: avg, bestPercent: best };
}

const CSV_COLS = [
  ["studentName", "Student"], ["studentCode", "Code"], ["className", "Class"],
  ["tool", "Activity"], ["topic", "Topic"], ["score", "Score"], ["total", "Out of"],
  ["percent", "Percent"], ["dateLabel", "Date"],
];

export function toCSV(records = []) {
  const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [CSV_COLS.map((c) => c[1]).join(","), ...records.map((r) => CSV_COLS.map((c) => esc(r[c[0]])).join(","))].join("\n");
}

/** A colour band for a percentage: hi ≥ 70, mid ≥ 50, lo below. */
export function band(p) { return p >= 70 ? "hi" : p >= 50 ? "mid" : "lo"; }
