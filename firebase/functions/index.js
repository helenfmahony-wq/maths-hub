/**
 * Teacher Platform — Cloud Functions.
 *
 * WHY THESE EXIST
 * ---------------
 * Students and teachers sign in with a short CODE, not an email and password.
 * A code is checked HERE, on the server, with the Admin SDK (which ignores the
 * Firestore rules). If it is valid, the function mints a Firebase Auth "custom
 * token" carrying a few small claims — { role, studentCode | teacherCode,
 * className } — and the browser signs in with that token. From then on the
 * Firestore rules (firestore.rules) read those claims to decide what each
 * person may see. Nobody can read the students/teachers collections before
 * they have signed in, so codes cannot be harvested.
 *
 * Everything that changes IDENTITY or what a class is told to do (creating
 * students, classes and tasks) also happens here, never from the browser.
 * Each function stamps the record with the CALLER'S OWN teacherCode taken from
 * the verified token — never from what the browser sent — so a teacher can
 * only ever touch their own classes.
 *
 * TEACHER CODE vs TEACHER ID
 * --------------------------
 * A teacher's CODE is their password (it is the document id in `teachers`).
 * It never leaves the server. Everything a student can see (their profile,
 * their sign-in token, their results) carries the teacher's ID instead: a
 * random, non-secret id the server gives each teacher the first time they
 * sign in (stored as `teacherId` on their teachers document). Records keep the
 * field name `teacherCode` for compatibility, but its value is that ID.
 *
 * DEPLOY:  cd firebase/functions && npm install && cd ../.. && firebase deploy --only functions
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Must match FUNCTIONS_REGION in assets/js/portal/config.js.
setGlobalOptions({ region: "australia-southeast1", maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Codes are upper-case letters, digits and hyphens. Same rule in the browser. */
function normaliseCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}
function fullName(d) {
  return d.name || [d.firstName, d.surname].filter(Boolean).join(" ") || "Student";
}
function cleanText(v, max = 80) {
  return String(v || "").trim().slice(0, max);
}
function cleanClass(v) {
  return cleanText(v, 40).toUpperCase();
}
function cleanDue(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Throws unless the caller signed in as a teacher. Returns their teacher ID. */
function requireTeacher(request) {
  const auth = request.auth;
  if (!auth || auth.token.role !== "teacher" || !auth.token.teacherCode) {
    throw new HttpsError("permission-denied", "Sign in with your teacher code first.");
  }
  return normaliseCode(auth.token.teacherCode);
}

/** Loads a doc and throws unless it belongs to this teacher. */
async function ownedDoc(collectionName, id, teacherCode, what = "item") {
  if (!id) throw new HttpsError("invalid-argument", `Missing ${what}.`);
  const ref = db.collection(collectionName).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", `That ${what} was not found.`);
  if (normaliseCode((snap.data() || {}).teacherCode) !== teacherCode) {
    throw new HttpsError("permission-denied", `You can only change your own ${what}s.`);
  }
  return { ref, data: snap.data() || {} };
}

// Student codes avoid characters that are easy to confuse (O/0, I/1/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(len = 6) {
  let c = "";
  for (let i = 0; i < len; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return c;
}
async function uniqueStudentCode() {
  for (let i = 0; i < 40; i++) {
    const code = randomCode();
    const snap = await db.collection("students").doc(code).get();
    if (!snap.exists) return code;
  }
  throw new HttpsError("internal", "Could not make a unique code. Please try again.");
}

async function uniqueTeacherId() {
  for (let i = 0; i < 40; i++) {
    const id = `T-${randomCode(8)}`;
    const taken = await db.collection("teachers").where("teacherId", "==", id).limit(1).get();
    if (taken.empty) return id;
  }
  throw new HttpsError("internal", "Could not make a unique teacher ID. Please try again.");
}

/** The teachers document for a teacher ID (from a verified token), or null. */
async function teacherById(teacherId) {
  const q = await db.collection("teachers").where("teacherId", "==", teacherId).limit(1).get();
  return q.empty ? null : q.docs[0].data();
}

// ---------------------------------------------------------------------------
// Sign-in (code exchange)
// ---------------------------------------------------------------------------

/**
 * exchangeStudentCode({ studentCode, pin? }) → { token, profile, claims }
 * Rejects unknown or inactive codes, and a wrong PIN if the student has one.
 */
exports.exchangeStudentCode = onCall(async (request) => {
  const code = normaliseCode(request.data && request.data.studentCode);
  if (!code) throw new HttpsError("invalid-argument", "Enter your student code.");

  const snap = await db.collection("students").doc(code).get();
  if (!snap.exists) throw new HttpsError("not-found", "Student code not found.");
  const doc = { studentCode: code, ...snap.data() };
  if (doc.active === false) throw new HttpsError("permission-denied", "This student code is not active.");

  if (doc.pin && String((request.data && request.data.pin) || "") !== String(doc.pin)) {
    throw new HttpsError("permission-denied", "Incorrect PIN. Check it with your teacher.");
  }

  const claims = {
    role: "student",
    studentCode: code,
    teacherCode: doc.teacherCode || "",
    className: doc.className || "",
  };
  const token = await admin.auth().createCustomToken(`student:${code}`, claims);
  const profile = {
    studentCode: code,
    firstName: doc.firstName || "",
    surname: doc.surname || "",
    name: fullName(doc),
    className: doc.className || "",
    teacherCode: doc.teacherCode || "",
    teacherName: doc.teacherName || "",
    school: doc.school || "",
  };
  return { token, profile, claims };
});

/** exchangeTeacherCode({ teacherCode }) → { token, profile, claims } */
exports.exchangeTeacherCode = onCall(async (request) => {
  const code = normaliseCode(request.data && request.data.teacherCode);
  if (!code) throw new HttpsError("invalid-argument", "Enter your teacher code.");

  const snap = await db.collection("teachers").doc(code).get();
  if (!snap.exists) throw new HttpsError("not-found", "Teacher code not found.");
  const doc = snap.data() || {};
  if (doc.active === false) throw new HttpsError("permission-denied", "This teacher code is not active.");

  // Give the teacher a public ID the first time they sign in (see top of file).
  let teacherId = normaliseCode(doc.teacherId);
  if (!teacherId) {
    teacherId = await uniqueTeacherId();
    await snap.ref.update({ teacherId });
  }

  const claims = { role: "teacher", teacherCode: teacherId };
  const token = await admin.auth().createCustomToken(`teacher:${teacherId}`, claims);
  const profile = {
    teacherCode: teacherId,
    teacherName: doc.teacherName || "",
    school: doc.school || "",
  };
  return { token, profile, claims };
});

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * createStudentForTeacher({ firstName, surname, className }) → the new student.
 * The student is stamped with the CALLER'S teacherCode. Returns the login code.
 */
exports.createStudentForTeacher = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const firstName = cleanText(d.firstName, 60);
  const surname = cleanText(d.surname, 60);
  const className = cleanClass(d.className);
  const name = [firstName, surname].filter(Boolean).join(" ");
  if (!name) throw new HttpsError("invalid-argument", "Enter the student's name.");
  if (!className) throw new HttpsError("invalid-argument", "Choose a class.");

  let teacherName = "", school = "";
  const t = await teacherById(teacherCode);
  if (t) { teacherName = t.teacherName || ""; school = t.school || ""; }

  const studentCode = await uniqueStudentCode();
  const student = {
    studentCode, firstName, surname, name, className,
    teacherCode, teacherName, school, active: true,
  };
  await db.collection("students").doc(studentCode).set({
    ...student, createdBy: "teacher-dashboard", createdAt: now(), updatedAt: now(),
  });
  return student;
});

/**
 * updateStudent({ studentCode, firstName?, surname?, className?, active? })
 * Rename a student, move them to another class, or switch their code off.
 * Only for students that belong to the caller. A student who is moved or
 * switched off picks up the change the next time they sign in.
 */
exports.updateStudent = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const code = normaliseCode(d.studentCode);
  const { ref, data } = await ownedDoc("students", code, teacherCode, "student");

  const patch = { updatedAt: now() };
  const firstName = d.firstName !== undefined ? cleanText(d.firstName, 60) : data.firstName || "";
  const surname = d.surname !== undefined ? cleanText(d.surname, 60) : data.surname || "";
  if (d.firstName !== undefined || d.surname !== undefined) {
    const name = [firstName, surname].filter(Boolean).join(" ");
    if (!name) throw new HttpsError("invalid-argument", "A student needs a name.");
    Object.assign(patch, { firstName, surname, name });
  }
  if (d.className !== undefined) {
    const className = cleanClass(d.className);
    if (!className) throw new HttpsError("invalid-argument", "Choose a class.");
    patch.className = className;
  }
  if (d.active !== undefined) patch.active = d.active === true;

  await ref.update(patch);
  const after = (await ref.get()).data() || {};
  delete after.createdAt; delete after.updatedAt; delete after.pin;
  return { ...after, studentCode: code };
});

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

/**
 * createClass({ name }) → { classId, name, teacherCode, active }
 * The doc id is `<TEACHERCODE>__<NAME>`, so adding the same class twice is
 * harmless, and a removed class comes back if it is added again.
 */
exports.createClass = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const name = cleanClass(request.data && request.data.name);
  if (!name) throw new HttpsError("invalid-argument", "Enter a class name.");

  const classId = `${teacherCode}__${name}`;
  const ref = db.collection("classes").doc(classId);
  const existing = await ref.get();
  await ref.set({
    classId, name, teacherCode, active: true,
    ...(existing.exists ? {} : { createdAt: now() }),
    updatedAt: now(),
  }, { merge: true });
  return { classId, name, teacherCode, active: true };
});

/** setClassActive({ classId, active }) — hides a class. Never touches students. */
exports.setClassActive = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const { ref } = await ownedDoc("classes", cleanText(d.classId, 120), teacherCode, "class");
  const active = d.active === true;
  await ref.update({ active, updatedAt: now() });
  return { classId: ref.id, active };
});

// ---------------------------------------------------------------------------
// Tasks (a quiz or activity set for a class, with an optional due date)
// ---------------------------------------------------------------------------

/**
 * createTask({ className, items:[{ toolId, title, launchUrl }], dueAt })
 * → { created:[task...] }. One task document per item, so each is tracked
 * (and can be removed) on its own.
 */
exports.createTask = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const className = cleanClass(d.className);
  if (!className) throw new HttpsError("invalid-argument", "Choose a class.");
  const items = Array.isArray(d.items) ? d.items.slice(0, 30) : [];
  if (!items.length) throw new HttpsError("invalid-argument", "Choose at least one activity.");
  const dueAt = cleanDue(d.dueAt);

  const batch = db.batch();
  const created = [];
  const seen = new Set();
  const assignedAt = Date.now();
  for (const it of items) {
    const toolId = cleanText(it && it.toolId, 80);
    if (!toolId || seen.has(toolId)) continue;
    seen.add(toolId);
    const ref = db.collection("tasks").doc();
    const task = {
      taskId: ref.id, teacherCode, className, toolId,
      title: cleanText(it.title, 160) || toolId,
      launchUrl: cleanText(it.launchUrl, 300),
      dueAt, assignedAt, active: true,
    };
    batch.set(ref, { ...task, createdAt: now() });
    created.push(task);
  }
  if (!created.length) throw new HttpsError("invalid-argument", "No valid activities to set.");
  await batch.commit();
  return { created };
});

/** updateTask({ taskId, dueAt }) — change the due date (null clears it). */
exports.updateTask = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const { ref } = await ownedDoc("tasks", cleanText(d.taskId, 120), teacherCode, "task");
  const dueAt = cleanDue(d.dueAt);
  await ref.update({ dueAt, updatedAt: now() });
  return { taskId: ref.id, dueAt };
});

/**
 * setTaskActive({ taskId, active }) — removes a task from students' lists.
 * Soft delete: the document stays, so past results still line up with it.
 */
exports.setTaskActive = onCall(async (request) => {
  const teacherCode = requireTeacher(request);
  const d = request.data || {};
  const { ref } = await ownedDoc("tasks", cleanText(d.taskId, 120), teacherCode, "task");
  const active = d.active === true;
  await ref.update({ active, updatedAt: now() });
  return { taskId: ref.id, active };
});
