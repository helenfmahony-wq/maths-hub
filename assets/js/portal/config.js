/**
 * ============================================================================
 *  THE ONE FILE TO EDIT WHEN YOU SET THIS UP.
 * ============================================================================
 *
 * 1. PLATFORM_NAME — the name shown in the top bar of every page.
 *
 * 2. FIREBASE_CONFIG — paste your own from:
 *      Firebase Console → ⚙ Project settings → General → "Your apps" →
 *      (add a Web app if there isn't one) → "SDK setup and configuration" → Config
 *    These values are PUBLIC by design. They identify your project; they do not
 *    unlock it. Security comes from Firebase sign-in + firebase/firestore.rules.
 *
 * This portal runs on the free Spark plan: no Cloud Functions are needed.
 */
export const PLATFORM_NAME = "Maths Hub";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAIto_Byi19j3XR9epwpvpjyv5C_lw7Sc0",
  authDomain: "helen-maths-21936.firebaseapp.com",
  projectId: "helen-maths-21936",
  storageBucket: "helen-maths-21936.firebasestorage.app",
  messagingSenderId: "334036828363",
  appId: "1:334036828363:web:ee3c4b185fe8db56905b4e",
};

// ----------------------------------------------------------------------------
// Teacher sign-in. The portal has one teacher account. On the sign-in page the
// teacher types only their code; behind the scenes that signs in to this
// Firebase account with the password  TEACHER_PASSWORD_PREFIX + code.
// So for the code MAH26 the account's password is "mathshub-MAH26".
// (Firebase passwords must be at least 6 characters, hence the prefix.)
// Create the account in Firebase Console → Authentication → Users → Add user.
// ----------------------------------------------------------------------------
export const TEACHER_EMAIL = "teacher@helen-maths.app";
export const TEACHER_PASSWORD_PREFIX = "mathshub-";

// ----------------------------------------------------------------------------
// You should not need to change anything below this line.
// ----------------------------------------------------------------------------

/** True once real Firebase details have been pasted in above. */
export function isConfigured() {
  return !!FIREBASE_CONFIG.apiKey && !/PASTE|YOUR-/.test(FIREBASE_CONFIG.apiKey + FIREBASE_CONFIG.projectId);
}

// Firestore collection names. firebase/firestore.rules uses the same names.
export const COLLECTIONS = Object.freeze({
  students: "students",
  teachers: "teachers",
  achievements: "achievements", // one record per finished quiz/activity
  classes: "classes",
  tasks: "tasks",               // quizzes/activities a teacher has set a class
  sessions: "sessions",         // which student code each signed-in device is using
});
