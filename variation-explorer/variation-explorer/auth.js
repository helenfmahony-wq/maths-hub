// Firebase sign-in and saving for the Variation Explorer.
// PLACEHOLDER: to be matched to the teacher's existing Firebase setup (config, how student codes are checked, where progress is stored).
export async function signIn(code) {
  throw new Error("Student sign-in isn’t switched on yet. Use “Continue as guest” for now.");
}
export async function signOutStudent() {}
export async function loadProgress(student) { return null; }
export async function saveProgress(student, data) {}
