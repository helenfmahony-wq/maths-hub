# Maths Hub: notes for Claude

Read README.md first: it describes the folder layout (tools/<strand>/<focus-area>/<tool>/,
following the NSW Mathematics K–10 syllabus) and how to add a tool.

## Rule for every student quiz

Every student quiz must save to the student portal and have a working
"Submit my work" button. Follow "Rule for every student quiz" in README.md:
register the quiz in assets/js/portal/toolRegistry.js, include
assets/js/portal/quizSignIn.js last before </body>, call PlatformProgress(...)
after every answered question (and with answered: 0 when an attempt starts), and
call PlatformSave(...) when the student finishes. portal/quiz-template.html is
the working example.

## Firebase

The portal runs on Firebase's free Spark plan (no Cloud Functions). Security
lives in firebase/firestore.rules. Any change to that file must be republished
in Firebase Console → Firestore Database → Rules → Publish, so say so whenever
it changes. Only ever save a score, never what a student typed.
