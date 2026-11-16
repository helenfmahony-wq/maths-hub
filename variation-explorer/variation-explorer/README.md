# Variation Explorer (Year 9: direct and inverse variation)

A self-paced student activity. Add this folder to the **maths-hub** repository, then connect it to the
same Firebase project and student-code sign-in that the **gradient (rise over run)** activity uses.

## Files
- `index.html`: the whole activity, plus the sign-in screen. There are no build steps.
- `auth.js`: **placeholder**. This is the only file that needs Firebase code.

## What's already done
- **Sign-in screen.** A student-code box and a "Continue as guest" button.
- **Guest mode.** Nothing is saved, not even to localStorage, and a yellow banner says so.
- **Guided steps.** There are 39 steps. Each one appears only after the one before is done or answered correctly. Each student gets their own shuffle of the multiple-choice options.
- **After a student signs in.** The page calls `loadProgress(student)` to resume. Then it calls `saveProgress(student, data)` about 0.6 s after every change.

## What to do: fill in `auth.js` to match the gradient activity
`auth.js` must export these four functions:

```js
export async function signIn(code)             // check the student code the same way the gradient activity does.
                                               // Resolve to a student object, e.g. { id, name, classCode }.
                                               // Throw an Error with a friendly message if the code is wrong.
export async function signOutStudent()         // sign out of Firebase (if the gradient activity signs in to Firebase Auth)
export async function loadProgress(student)    // resolve to the saved data object below, or null if none
export async function saveProgress(student, data)  // store the data object below
```

Use the same Firebase config, the same import style (CDN modules or otherwise) and the same database layout
as the gradient activity. Store progress under this activity's id, **`variation-explorer`**, in the same
way the gradient activity stores its own results, so the teacher's existing results view can find it.

### The `data` object saved for each student
```json
{
  "step": 12,            // index of the step the student is up to (0-based)
  "total": 39,           // number of steps
  "i": 12,               // same as step (used to resume)
  "on": true,            // whether the step panel is open
  "answers": { "3": "12", "5": "It doubles", "38": "free-text answer…" },  // key = step index
  "tries":   { "3": 1 },  // extra (wrong) attempts per step
  "st":      { "5": { "order": [2,0,3,1] } }  // per-student state (choice order etc.), needed to resume
}
```
Step 38 (0-based) is the one free-text answer, for the teacher to read.

## Testing
1. Open `index.html` through a local server or GitHub Pages. The ES module import needs http, not file://.
2. Choose guest. Check that progress is lost on reload.
3. Sign in with a test student code. Complete a few steps, reload, sign in again, and check that it resumes on the same step.
