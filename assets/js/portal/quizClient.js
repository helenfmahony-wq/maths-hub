/**
 * Quiz client — what a quiz page uses to sign a student in and save a result.
 * Most quizzes never import this directly: they include quizSignIn.js, which
 * loads it and gives the page window.PlatformSave(...).
 *
 * Only a SCORE is saved (plus which quiz, the topic and when). Never what the
 * student typed. In demo mode (?demo) results go to the pretend database in
 * demo.js instead of Firebase.
 */
import { FIREBASE_CONFIG, COLLECTIONS } from "./config.js";
import { isDemo, demoCall, demoAddResult } from "./demo.js";
import { normaliseCode, studentSignIn } from "./studentSession.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
let _sdk = null;
let _student = null;

function sdk() {
  if (!_sdk) {
    _sdk = Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]).then(([app, auth, fs]) => {
      // A named app, so a quiz embedded in a dashboard page never clashes with it.
      const a = app.initializeApp(FIREBASE_CONFIG, "quiz");
      return {
        auth: auth.getAuth(a), signInAnonymously: auth.signInAnonymously,
        db: fs.getFirestore(a), collection: fs.collection, addDoc: fs.addDoc,
        doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc, serverTimestamp: fs.serverTimestamp,
      };
    });
    _sdk.catch(() => { _sdk = null; });
  }
  return _sdk;
}

export function init() { if (!isDemo()) sdk().catch(() => {}); }
export function getStudent() { return _student; }

export async function signIn(code) {
  try {
    if (isDemo()) _student = (await demoCall("exchangeStudentCode", { studentCode: normaliseCode(code) })).profile;
    else _student = await studentSignIn(await sdk(), code);
    return { ok: true, profile: _student };
  } catch (err) {
    const m = String((err && err.message) || err || "");
    if (/not found/i.test(m)) return { ok: false, error: "Student code not found. Check it with your teacher." };
    if (/switched off|not active/i.test(m)) return { ok: false, error: "This student code has been switched off." };
    return { ok: false, error: "Couldn't check that code right now. You can skip and still do the quiz." };
  }
}

/**
 * Save one result as the signed-in student.
 *   payload: { toolId (required), score, total, topic?, title?,
 *              answered?, complete? }
 *   complete: false marks an early submission (the Submit button); answered is
 *   how many questions were done by then.
 */
export async function saveResult(payload = {}) {
  if (!_student) return { saved: false, reason: "not-signed-in" };
  if (!payload.toolId) throw new Error("saveResult needs a toolId (see assets/js/portal/toolRegistry.js).");
  // Kept within what firestore.rules accept: 0 ≤ score ≤ total ≤ 1000, short text.
  const total = Math.min(1000, Math.max(0, Number(payload.total) || 0));
  const score = Math.min(total, Math.max(0, Number(payload.score) || 0));
  const complete = payload.complete !== false;
  const answered = complete ? total : Math.min(total, Math.max(0, Math.round(Number(payload.answered) || 0)));
  const record = {
    studentCode: _student.studentCode,
    studentName: String(_student.name || "").slice(0, 130),
    className: _student.className || "",
    teacherCode: _student.teacherCode || "",
    toolId: String(payload.toolId).slice(0, 80),
    toolTitle: String(payload.title || "").slice(0, 160),
    topic: String(payload.topic || "").slice(0, 80),
    score, total,
    percent: total ? Math.round((score / total) * 100) : 0,
    answered, complete,
    createdAtClient: new Date().toISOString(),
  };
  if (isDemo()) { demoAddResult(record); return { saved: true, demo: true }; }
  const s = await sdk();
  await s.addDoc(s.collection(s.db, COLLECTIONS.achievements), { ...record, createdAt: s.serverTimestamp() });
  return { saved: true };
}
