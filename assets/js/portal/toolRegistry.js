/**
 * TOOL REGISTRY — the list of quizzes/activities that report results to the
 * dashboards. A teacher can only set a task from this list, and the dashboards
 * use it to put names on results.
 *
 * TO ADD A QUIZ:
 *   1. Add an entry below. `toolId` is a short permanent id — never change it
 *      once results exist, because results are matched to tools by it.
 *   2. In the quiz page, save results with that same toolId:
 *        PlatformSave({ toolId: "times-tables", score: 8, total: 10, topic: "Multiplication" })
 *      (see portal/quiz-template.html for a complete working example).
 *
 *   toolId     permanent id written into every result
 *   title      what teachers and students see
 *   topic      groups tools in the "Set a task" list and in topic analytics
 *   stage      optional label, e.g. "Stage 4" or "Year 7"
 *   path       where the page lives, relative to the site's top folder (where index.html is)
 *   enabled    false hides it from the lists but keeps old results named
 */
export const TOOLS = Object.freeze([
  {
    toolId: "rise-and-run-quiz",
    title: "Rise & Run: Gradient Quiz",
    topic: "Linear relationships",
    stage: "Stage 5",
    path: "tools/number-algebra/linear-relationships/rise-and-run/quiz.html",
    enabled: true,
  },
  {
    // The copy-me example in portal/quiz-template.html. Also used by demo mode.
    toolId: "times-tables",
    title: "Times Tables Check-in (sample)",
    topic: "Number",
    stage: "Stage 3",
    path: "portal/quiz-template.html",
    enabled: true,
  },
  // {
  //   toolId: "fractions-basics",
  //   title: "Fractions Basics",
  //   topic: "Fractions, decimals and percentages",
  //   stage: "Stage 4",
  //   path: "tools/number-algebra/fractions-decimals-percentages/fractions-basics/index.html",
  //   enabled: true,
  // },
]);

// The site's top folder (where index.html lives), worked out from where this
// file lives (assets/js/portal/), so links work whether the site is at a
// domain root or in a sub-folder such as GitHub Pages' /maths-hub/.
const SITE_ROOT = new URL("../../../", import.meta.url);

/** Full URL for a path inside the site. External http(s) links pass straight through. */
export function siteUrl(path) {
  if (!path) return "#";
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ""), SITE_ROOT).href;
}

export function getEnabledTools() { return TOOLS.filter((t) => t.enabled !== false); }
export function getTool(toolId) { return TOOLS.find((t) => t.toolId === toolId) || null; }
export function toolTitle(toolId, fallback = "") {
  const t = getTool(toolId);
  return t ? t.title : (fallback || toolId || "Activity");
}
