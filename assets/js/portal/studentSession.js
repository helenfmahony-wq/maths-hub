/**
 * Student sign-in by code, shared by the student dashboard (authClient.js) and
 * quiz pages (quizClient.js). Works on the free Spark plan:
 *
 *   1. The browser signs in to Firebase anonymously (no name, no email).
 *   2. It reads students/<CODE>. The rules let a signed-in browser read a
 *      student record only by its exact code, so the code acts as a password.
 *   3. It writes sessions/<its own uid> = { studentCode }. From then on the
 *      rules look up that session to decide which results and tasks this
 *      browser may see, and which results it may save.
 */

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normaliseCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/** A random student code (8 characters, no easily confused O/0, I/1/L). */
export function randomStudentCode(len = 8) {
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  return Array.from(bytes, (n) => ALPHA[n % ALPHA.length]).join("");
}

/**
 * Sign a browser in as the student with this code.
 *   s: { auth, db, signInAnonymously, doc, getDoc, setDoc, serverTimestamp }
 * Returns the student's profile, or throws an Error with a friendly message.
 */
export async function studentSignIn(s, rawCode) {
  const code = normaliseCode(rawCode);
  if (!code) throw new Error("Type your student code first.");

  await s.auth.authStateReady();
  if (!s.auth.currentUser || !s.auth.currentUser.isAnonymous) {
    await s.signInAnonymously(s.auth);
  }

  const snap = await s.getDoc(s.doc(s.db, "students", code));
  if (!snap.exists()) throw new Error("That code was not found. Check it and try again.");
  const st = snap.data() || {};
  if (st.active === false) throw new Error("That code has been switched off. Please check with your teacher.");

  await s.setDoc(s.doc(s.db, "sessions", s.auth.currentUser.uid), {
    studentCode: code,
    createdAt: s.serverTimestamp(),
  });

  return {
    studentCode: code,
    firstName: st.firstName || "",
    surname: st.surname || "",
    name: st.name || [st.firstName, st.surname].filter(Boolean).join(" ") || "Student",
    className: st.className || "",
    teacherCode: st.teacherCode || "",
    teacherName: st.teacherName || "",
    school: st.school || "",
  };
}
