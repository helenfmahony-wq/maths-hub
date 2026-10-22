/**
 * DEMO MODE — the whole platform running in this browser with made-up data.
 *
 * Add ?demo to any page address (e.g. /teacher/?demo) to switch it on for this
 * browser tab; ?demo=off switches it off again. Nothing touches Firebase and
 * nothing leaves the computer: the pretend database lives in this browser's
 * localStorage, and "Reset demo" puts it back to the starting data.
 *
 *   Teacher code:  DEMO
 *   Student code:  AVA234   (any student code shown in the teacher dashboard works too)
 *
 * The pretend server below follows the same rules as authClient.js and firestore.rules —
 * a teacher can only change their own students, classes and tasks.
 *
 * Safe to delete this file (and the ?demo bits) once the real site is running.
 */
const FLAG = "tp-demo-mode";
const STORE = "tp-demo-store-v1";
const AUTH = "tp-demo-auth";

export const DEMO_TEACHER_CODE = "DEMO";
export const DEMO_STUDENT_CODE = "AVA234";

let on = false;
try {
  const p = new URLSearchParams(location.search);
  if (p.has("demo")) {
    if (p.get("demo") === "off") sessionStorage.removeItem(FLAG);
    else sessionStorage.setItem(FLAG, "1");
  }
  on = sessionStorage.getItem(FLAG) === "1";
} catch {
  on = new URLSearchParams(location.search).has("demo");
}
export function isDemo() { return on; }

// ---------------------------------------------------------------------------
// Starting data (the same every time, so a reset always looks the same)
// ---------------------------------------------------------------------------
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function seed() {
  const r = rng(20261016);
  const DAY = 86400000, now = Date.now();
  const docs = {};
  const T = DEMO_TEACHER_CODE;
  docs[`teachers/${T}`] = { teacherName: "Ms Demo", school: "Sample High School", active: true };
  ["7A", "8B"].forEach((c) => (docs[`classes/${T}__${c}`] = { classId: `${T}__${c}`, name: c, teacherCode: T, active: true }));

  const roll = {
    "7A": ["Ava Nguyen", "Liam Brown", "Mia Patel", "Noah Smith", "Isla Wilson", "Oliver Chen", "Zara Ali", "Jack Taylor", "Ruby Martin", "Leo Kelly", "Grace O'Brien", "Henry Tran"],
    "8B": ["Chloe Davis", "Ethan Wright", "Amelia Singh", "Lucas Walker", "Sophie Hall", "Mason Lee", "Ella Robinson", "Archie King", "Lily Scott", "Thomas Young"],
  };
  // Some fixed character traits so the analytics have something to say.
  const quiet = new Set(["Henry Tran", "Thomas Young"]);           // no results at all
  const struggling = new Set(["Leo Kelly", "Archie King"]);       // averaging under 50%
  const tools = [
    { toolId: "times-tables", toolTitle: "Times Tables Check-in", topic: "Number", diff: 0 },
    { toolId: "demo-fractions", toolTitle: "Fractions Basics", topic: "Fractions", diff: 0.12 },
    { toolId: "demo-algebra", toolTitle: "Algebra Warm-up", topic: "Algebra", diff: 0.18 },
    { toolId: "demo-angles", toolTitle: "Angles", topic: "Geometry", diff: 0.06 },
  ];
  let n = 0;
  const taskSet = { "7A": now - 6 * DAY, "8B": now - 2 * DAY };

  Object.entries(roll).forEach(([cls, names]) => {
    names.forEach((name, i) => {
      let code = cls === "7A" && i === 0 ? DEMO_STUDENT_CODE : "";
      while (!code || docs[`students/${code}`]) code = Array.from({ length: 6 }, () => ALPHA[Math.floor(r() * ALPHA.length)]).join("");
      const [firstName, ...rest] = name.split(" ");
      docs[`students/${code}`] = { studentCode: code, firstName, surname: rest.join(" "), name, className: cls, teacherCode: T, teacherName: "Ms Demo", school: "Sample High School", active: true };
      if (quiet.has(name)) return;

      const ability = struggling.has(name) ? 0.3 + r() * 0.12 : 0.55 + r() * 0.4;
      const count = 3 + Math.floor(r() * 7);
      for (let k = 0; k < count; k++) {
        const daysAgo = 0.3 + r() * 55;
        // Times tables only before the task was set, so it doesn't count as doing the task.
        const pool = daysAgo < 9 ? tools.slice(1) : tools;
        const tool = pool[Math.floor(r() * pool.length)];
        addResult(docs, ++n, { code, name, cls }, tool, ability, now - daysAgo * DAY, r);
      }
      // Most of the class has done the task they were set.
      const doneTask = name !== "Ava Nguyen" && r() < (cls === "7A" ? 0.75 : 0.35);
      if (doneTask) addResult(docs, ++n, { code, name, cls }, tools[0], ability, taskSet[cls] + r() * (now - taskSet[cls] - 3600000), r);
    });
  });

  docs["tasks/demotask1"] = { taskId: "demotask1", teacherCode: T, className: "7A", toolId: "times-tables", title: "Times Tables Check-in", launchUrl: "portal/quiz-template.html", dueAt: endOfDay(now + 2 * DAY), assignedAt: taskSet["7A"], active: true };
  docs["tasks/demotask2"] = { taskId: "demotask2", teacherCode: T, className: "8B", toolId: "times-tables", title: "Times Tables Check-in", launchUrl: "portal/quiz-template.html", dueAt: endOfDay(now + 5 * DAY), assignedAt: taskSet["8B"], active: true };
  return { docs, n: 1000 };
}
function addResult(docs, id, s, tool, ability, time, r) {
  const p = Math.max(0.05, Math.min(1, ability - tool.diff + (r() - 0.5) * 0.3));
  const score = Math.round(p * 10);
  docs[`achievements/demo${id}`] = {
    studentCode: s.code, studentName: s.name, className: s.cls, teacherCode: DEMO_TEACHER_CODE,
    toolId: tool.toolId, toolTitle: tool.toolTitle, topic: tool.topic,
    score, total: 10, percent: score * 10, createdAtClient: new Date(time).toISOString(),
  };
}
function endOfDay(t) { const d = new Date(t); d.setHours(23, 59, 59, 0); return d.getTime(); }

// ---------------------------------------------------------------------------
// The pretend database
// ---------------------------------------------------------------------------
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.docs) return s; } catch { /* fall through */ }
  const s = seed(); save(s); return s;
}
function save(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage full or blocked */ } }
export function resetDemo() { try { localStorage.removeItem(STORE); sessionStorage.removeItem(AUTH); } catch { /* ignore */ } }

function auth() { try { return JSON.parse(sessionStorage.getItem(AUTH) || "null"); } catch { return null; } }
function setAuth(claims) { try { claims ? sessionStorage.setItem(AUTH, JSON.stringify(claims)) : sessionStorage.removeItem(AUTH); } catch { /* ignore */ } }
export function demoSignOut() { setAuth(null); }

/** Equality query, like where(a,"==",x).where(b,"==",y). */
export function demoList(collectionName, filters = []) {
  const s = load();
  return Object.entries(s.docs)
    .filter(([k]) => k.startsWith(collectionName + "/"))
    .map(([k, v]) => ({ id: k.slice(collectionName.length + 1), ...v }))
    .filter((d) => filters.every(([f, v]) => d[f] === v));
}

/** A quiz saving a result (same checks as the achievements rule). */
export function demoAddResult(data) {
  const a = auth();
  if (!a || a.role !== "student" || data.studentCode !== a.studentCode || data.teacherCode !== a.teacherCode || data.className !== a.className) {
    throw new Error("Missing or insufficient permissions.");
  }
  const s = load();
  s.docs[`achievements/demo${++s.n}`] = { ...data };
  save(s);
}

const fail = (msg) => { throw new Error(msg); };
const clean = (v, max = 80) => String(v || "").trim().slice(0, max);
const upper = (v) => clean(v, 40).toUpperCase();

/** The pretend back end. Same names, inputs and outputs as the teacher actions in authClient.js. */
export async function demoCall(name, d = {}) {
  await new Promise((res) => setTimeout(res, 150)); // feel like a network call
  const s = load(), a = auth() || {};
  const get = (k) => s.docs[k];
  const put = (k, v) => { s.docs[k] = v; save(s); };
  const teacher = () => (a.role === "teacher" ? a.teacherCode : fail("Sign in as a teacher first."));
  const owned = (k, tc, what) => { const doc = get(k); if (!doc) fail(`That ${what} was not found.`); if (doc.teacherCode !== tc) fail(`You can only change your own ${what}s.`); return doc; };

  switch (name) {
    case "exchangeTeacherCode": {
      const code = upper(d.teacherCode), t = get(`teachers/${code}`);
      if (!t) fail("Teacher code not found.");
      const claims = { role: "teacher", teacherCode: code };
      setAuth(claims);
      return { token: "demo", claims, profile: { teacherCode: code, teacherName: t.teacherName, school: t.school } };
    }
    case "exchangeStudentCode": {
      const code = upper(d.studentCode), st = get(`students/${code}`);
      if (!st) fail("Student code not found.");
      if (st.active === false) fail("This student code is not active.");
      const claims = { role: "student", studentCode: code, teacherCode: st.teacherCode, className: st.className };
      setAuth(claims);
      return { token: "demo", claims, profile: { ...st, studentCode: code } };
    }
    case "createStudentForTeacher": {
      const tc = teacher();
      const firstName = clean(d.firstName, 60), surname = clean(d.surname, 60), className = upper(d.className);
      const nm = [firstName, surname].filter(Boolean).join(" ");
      if (!nm) fail("Enter the student's name.");
      if (!className) fail("Choose a class.");
      let code = "";
      while (!code || get(`students/${code}`)) code = Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
      const t = get(`teachers/${tc}`) || {};
      const st = { studentCode: code, firstName, surname, name: nm, className, teacherCode: tc, teacherName: t.teacherName || "", school: t.school || "", active: true };
      put(`students/${code}`, st);
      return st;
    }
    case "updateStudent": {
      const tc = teacher(), code = upper(d.studentCode), st = owned(`students/${code}`, tc, "student");
      if (d.firstName !== undefined || d.surname !== undefined) {
        const firstName = d.firstName !== undefined ? clean(d.firstName, 60) : st.firstName;
        const surname = d.surname !== undefined ? clean(d.surname, 60) : st.surname;
        const nm = [firstName, surname].filter(Boolean).join(" ");
        if (!nm) fail("A student needs a name.");
        Object.assign(st, { firstName, surname, name: nm });
      }
      if (d.className !== undefined) { const c = upper(d.className); if (!c) fail("Choose a class."); st.className = c; }
      if (d.active !== undefined) st.active = d.active === true;
      put(`students/${code}`, st);
      return { ...st };
    }
    case "createClass": {
      const tc = teacher(), nm = upper(d.name);
      if (!nm) fail("Enter a class name.");
      const classId = `${tc}__${nm}`;
      put(`classes/${classId}`, { classId, name: nm, teacherCode: tc, active: true });
      return { classId, name: nm, teacherCode: tc, active: true };
    }
    case "setClassActive": {
      const tc = teacher(), c = owned(`classes/${d.classId}`, tc, "class");
      c.active = d.active === true; put(`classes/${d.classId}`, c);
      return { classId: d.classId, active: c.active };
    }
    case "createTask": {
      const tc = teacher(), className = upper(d.className);
      if (!className) fail("Choose a class.");
      const items = Array.isArray(d.items) ? d.items : [];
      if (!items.length) fail("Choose at least one activity.");
      const created = [], seen = new Set();
      for (const it of items) {
        if (!it.toolId || seen.has(it.toolId)) continue;
        seen.add(it.toolId);
        const taskId = `demotask${++s.n}`;
        const t = { taskId, teacherCode: tc, className, toolId: it.toolId, title: clean(it.title, 160) || it.toolId, launchUrl: clean(it.launchUrl, 300), dueAt: d.dueAt || null, assignedAt: Date.now(), active: true };
        s.docs[`tasks/${taskId}`] = t; created.push(t);
      }
      save(s);
      return { created };
    }
    case "updateTask": {
      const tc = teacher(), t = owned(`tasks/${d.taskId}`, tc, "task");
      t.dueAt = d.dueAt || null; put(`tasks/${d.taskId}`, t);
      return { taskId: d.taskId, dueAt: t.dueAt };
    }
    case "setTaskActive": {
      const tc = teacher(), t = owned(`tasks/${d.taskId}`, tc, "task");
      t.active = d.active === true; put(`tasks/${d.taskId}`, t);
      return { taskId: d.taskId, active: t.active };
    }
  }
  fail(`Unknown function ${name}.`);
}

// ---------------------------------------------------------------------------
// The "you're in demo mode" bar
// ---------------------------------------------------------------------------
export function mountDemoBanner(hint = "") {
  if (!on || document.getElementById("demoBar")) return;
  const bar = document.createElement("div");
  bar.id = "demoBar";
  bar.className = "demo-banner";
  bar.innerHTML = `<span><strong>Demo mode</strong> — made-up data, stored only in this browser.${hint ? " " + hint : ""}</span>
    <span class="demo-actions"><button type="button" id="demoReset">Reset demo data</button><button type="button" id="demoExit">Leave demo</button></span>`;
  document.body.prepend(bar);
  document.getElementById("demoReset").addEventListener("click", () => {
    if (confirm("Put the demo back to its starting data? Anything you added in the demo will go.")) { resetDemo(); location.reload(); }
  });
  document.getElementById("demoExit").addEventListener("click", () => {
    try { sessionStorage.removeItem(FLAG); sessionStorage.removeItem(AUTH); } catch { /* ignore */ }
    location.href = location.pathname;
  });
}
