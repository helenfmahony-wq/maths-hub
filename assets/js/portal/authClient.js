/**
 * Sign-in, reading data, and saving changes for the dashboards.
 *
 * Runs on the free Spark plan (no Cloud Functions):
 *   * The teacher types a teacher code. That signs in to the one teacher
 *     account (TEACHER_EMAIL in config.js) with the password
 *     TEACHER_PASSWORD_PREFIX + code. The account only counts as a teacher
 *     once there is a teachers/<its uid> document (you add it in the Firebase
 *     Console — see firebase/SETUP.md).
 *   * Students sign in with their code (see studentSession.js).
 *   * Teachers write students, classes and tasks straight to Firestore, and
 *     firebase/firestore.rules check that each one is stamped with that
 *     teacher's own id, so no teacher can touch another teacher's class.
 *
 * In records, `teacherCode` holds the teacher's Firebase user id (not secret).
 *
 * The Firebase SDK is loaded from Google's CDN the first time it's needed, so
 * there is nothing to install or build. In demo mode (?demo) it is never
 * loaded at all — see demo.js.
 */
import { FIREBASE_CONFIG, COLLECTIONS, TEACHER_EMAIL, TEACHER_PASSWORD_PREFIX, isConfigured } from "./config.js";
import { isDemo, demoCall, demoList, demoSignOut, DEMO_TEACHER_CODE } from "./demo.js";
import { normaliseCode, randomStudentCode, studentSignIn } from "./studentSession.js";

export { normaliseCode };

// If you change the SDK version, change it here and in quizClient.js.
const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

let _sdk = null; // Promise of { auth, db, fns... }
let _teacher = null; // signed-in teacher's profile

function sdk() {
  if (!_sdk) {
    _sdk = Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]).then(([app, auth, fs]) => {
      const a = app.initializeApp(FIREBASE_CONFIG);
      return {
        auth: auth.getAuth(a), signInAnonymously: auth.signInAnonymously,
        signInWithEmailAndPassword: auth.signInWithEmailAndPassword,
        signOut: auth.signOut,
        db: fs.getFirestore(a), collection: fs.collection, query: fs.query, where: fs.where, getDocs: fs.getDocs,
        doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc, updateDoc: fs.updateDoc,
        writeBatch: fs.writeBatch, runTransaction: fs.runTransaction, serverTimestamp: fs.serverTimestamp,
      };
    });
    _sdk.catch(() => { _sdk = null; }); // let a later click try again
  }
  return _sdk;
}

/** Start loading Firebase in the background so the first click is quick. */
export function initPortal() {
  if (!isDemo()) sdk().catch(() => { /* reported when used */ });
}

/** Turn a Firebase error into something a teacher or student can act on. */
export function friendlyError(err) {
  const code = String((err && err.code) || "");
  const m = String((err && err.message) || err || "");
  if (!code && m && !/firebase/i.test(m)) return m; // our own messages
  if (isDemo()) return m || "Something went wrong.";
  if (!isConfigured()) return "This site isn't connected to Firebase yet — see assets/js/portal/config.js (or try the demo: add ?demo to the address).";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "That code isn't right. Check it and try again.";
  if (/too-many-requests/.test(code)) return "Too many tries. Wait a few minutes and try again.";
  if (/operation-not-allowed|admin-restricted-operation/.test(code))
    return "This sign-in method isn't switched on yet. In Firebase Console → Authentication → Sign-in method, enable Email/Password and Anonymous (see firebase/SETUP.md).";
  if (/permission-denied/.test(code)) return "The database refused that. Check the latest firebase/firestore.rules are published.";
  if (/unavailable|network/.test(code) || /network|failed to fetch|dynamically imported/i.test(m))
    return "Firebase can't be reached right now. Check your internet connection and try again.";
  return m || "Something went wrong. Please try again.";
}

/**
 * Read documents matching ALL the given equality filters, e.g.
 *   listWhere("students", [["teacherCode", teacherId]])
 * Returns [{ id, ...fields }]. The rules require the right filters (see firestore.rules).
 */
export async function listWhere(collectionName, filters = []) {
  if (isDemo()) return demoList(collectionName, filters);
  const s = await sdk();
  const q = s.query(s.collection(s.db, collectionName), ...filters.map(([f, v]) => s.where(f, "==", v)));
  return (await s.getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export async function loginStudent(code) {
  try {
    if (isDemo()) {
      const data = await demoCall("exchangeStudentCode", { studentCode: normaliseCode(code) });
      return { ok: true, role: "student", profile: data.profile };
    }
    const s = await sdk();
    return { ok: true, role: "student", profile: await studentSignIn(s, code) };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function loginTeacher(teacherCode) {
  try {
    if (isDemo()) {
      const data = await demoCall("exchangeTeacherCode", { teacherCode: DEMO_TEACHER_CODE });
      _teacher = data.profile;
      return { ok: true, role: "teacher", profile: _teacher };
    }
    const s = await sdk();
    const cred = await s.signInWithEmailAndPassword(s.auth, TEACHER_EMAIL, TEACHER_PASSWORD_PREFIX + normaliseCode(teacherCode));
    const uid = cred.user.uid;
    let t = null;
    try { const snap = await s.getDoc(s.doc(s.db, COLLECTIONS.teachers, uid)); t = snap.exists() ? snap.data() : null; }
    catch { t = null; }
    if (!t) {
      await s.signOut(s.auth);
      return { ok: false, error: `Signed in, but this account isn't set up as a teacher yet. In Firestore, add a teachers document with ID ${uid} (see firebase/SETUP.md, step 6).` };
    }
    if (t.active === false) {
      await s.signOut(s.auth);
      return { ok: false, error: "This teacher account has been switched off." };
    }
    _teacher = { teacherCode: uid, teacherName: t.teacherName || "", school: t.school || "" };
    return { ok: true, role: "teacher", profile: _teacher };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function logout() {
  _teacher = null;
  if (isDemo()) { demoSignOut(); return; }
  try { if (_sdk) { const s = await _sdk; await s.signOut(s.auth); } } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Teacher actions. Same names, inputs and outputs as the demo (demo.js).
// firestore.rules check every write belongs to the signed-in teacher.
// ---------------------------------------------------------------------------

const cleanText = (v, max = 80) => String(v || "").trim().slice(0, max);
const cleanClass = (v) => cleanText(v, 40).toUpperCase().replace(/[\/]/g, "-");
const cleanDue = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

async function teacherAction(demoName, data, fn) {
  try {
    if (isDemo()) return await demoCall(demoName, data || {});
    if (!_teacher) throw new Error("Sign in as a teacher first.");
    const s = await sdk();
    return await fn(s, _teacher.teacherCode, data || {});
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}

async function ownedRef(s, coll, id, tc, what) {
  if (!id) throw new Error(`Missing ${what}.`);
  const ref = s.doc(s.db, coll, id);
  const snap = await s.getDoc(ref);
  if (!snap.exists()) throw new Error(`That ${what} was not found.`);
  if ((snap.data() || {}).teacherCode !== tc) throw new Error(`You can only change your own ${what}s.`);
  return { ref, data: snap.data() || {} };
}

export const createStudent = (p) => teacherAction("createStudentForTeacher", p, async (s, tc, d) => {
  const firstName = cleanText(d.firstName, 60), surname = cleanText(d.surname, 60), className = cleanClass(d.className);
  const name = [firstName, surname].filter(Boolean).join(" ");
  if (!name) throw new Error("Enter the student's name.");
  if (!className) throw new Error("Choose a class.");
  const student = {
    studentCode: "", firstName, surname, name, className,
    teacherCode: tc, teacherName: _teacher.teacherName || "", school: _teacher.school || "", active: true,
  };
  for (let i = 0; i < 10; i++) {
    const code = randomStudentCode();
    const ref = s.doc(s.db, COLLECTIONS.students, code);
    const made = await s.runTransaction(s.db, async (tx) => {
      if ((await tx.get(ref)).exists()) return false;
      tx.set(ref, { ...student, studentCode: code, createdAt: s.serverTimestamp(), updatedAt: s.serverTimestamp() });
      return true;
    });
    if (made) return { ...student, studentCode: code };
  }
  throw new Error("Could not make a unique code. Please try again.");
});

export const updateStudent = (p) => teacherAction("updateStudent", p, async (s, tc, d) => {
  const code = normaliseCode(d.studentCode);
  const { ref, data } = await ownedRef(s, COLLECTIONS.students, code, tc, "student");
  const patch = { updatedAt: s.serverTimestamp() };
  if (d.firstName !== undefined || d.surname !== undefined) {
    const firstName = d.firstName !== undefined ? cleanText(d.firstName, 60) : data.firstName || "";
    const surname = d.surname !== undefined ? cleanText(d.surname, 60) : data.surname || "";
    const name = [firstName, surname].filter(Boolean).join(" ");
    if (!name) throw new Error("A student needs a name.");
    Object.assign(patch, { firstName, surname, name });
  }
  if (d.className !== undefined) {
    const className = cleanClass(d.className);
    if (!className) throw new Error("Choose a class.");
    patch.className = className;
  }
  if (d.active !== undefined) patch.active = d.active === true;
  await s.updateDoc(ref, patch);
  const after = { ...data, ...patch, studentCode: code };
  delete after.createdAt; delete after.updatedAt;
  return after;
});

export const createClass = (name) => teacherAction("createClass", { name }, async (s, tc, d) => {
  const nm = cleanClass(d.name);
  if (!nm) throw new Error("Enter a class name.");
  const classId = `${tc}__${nm}`;
  await s.setDoc(s.doc(s.db, COLLECTIONS.classes, classId),
    { classId, name: nm, teacherCode: tc, active: true, updatedAt: s.serverTimestamp() }, { merge: true });
  return { classId, name: nm, teacherCode: tc, active: true };
});

export const setClassActive = (classId, active) => teacherAction("setClassActive", { classId, active: active === true }, async (s, tc, d) => {
  const { ref } = await ownedRef(s, COLLECTIONS.classes, cleanText(d.classId, 200), tc, "class");
  await s.updateDoc(ref, { active: d.active, updatedAt: s.serverTimestamp() });
  return { classId: ref.id, active: d.active };
});

export const createTask = (p) => teacherAction("createTask", p, async (s, tc, d) => {
  const className = cleanClass(d.className);
  if (!className) throw new Error("Choose a class.");
  const items = Array.isArray(d.items) ? d.items.slice(0, 30) : [];
  if (!items.length) throw new Error("Choose at least one activity.");
  const dueAt = cleanDue(d.dueAt);
  const batch = s.writeBatch(s.db);
  const created = [], seen = new Set(), assignedAt = Date.now();
  for (const it of items) {
    const toolId = cleanText(it && it.toolId, 80);
    if (!toolId || seen.has(toolId)) continue;
    seen.add(toolId);
    const ref = s.doc(s.collection(s.db, COLLECTIONS.tasks));
    const task = {
      taskId: ref.id, teacherCode: tc, className, toolId,
      title: cleanText(it.title, 160) || toolId, launchUrl: cleanText(it.launchUrl, 300),
      dueAt, assignedAt, active: true,
    };
    batch.set(ref, { ...task, createdAt: s.serverTimestamp() });
    created.push(task);
  }
  if (!created.length) throw new Error("No valid activities to set.");
  await batch.commit();
  return { created };
});

export const updateTask = (taskId, dueAt) => teacherAction("updateTask", { taskId, dueAt }, async (s, tc, d) => {
  const { ref } = await ownedRef(s, COLLECTIONS.tasks, cleanText(d.taskId, 120), tc, "task");
  const due = cleanDue(d.dueAt);
  await s.updateDoc(ref, { dueAt: due, updatedAt: s.serverTimestamp() });
  return { taskId: ref.id, dueAt: due };
});

export const setTaskActive = (taskId, active) => teacherAction("setTaskActive", { taskId, active: active === true }, async (s, tc, d) => {
  const { ref } = await ownedRef(s, COLLECTIONS.tasks, cleanText(d.taskId, 120), tc, "task");
  await s.updateDoc(ref, { active: d.active, updatedAt: s.serverTimestamp() });
  return { taskId: ref.id, active: d.active };
});
