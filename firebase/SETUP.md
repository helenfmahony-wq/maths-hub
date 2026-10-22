# Setting up Firebase for the Maths Hub portal

The portal lets teachers create student logins, print login cards, set quizzes
and see results. Students sign in with an 8-character code, and every quiz
that is connected to the portal saves their score to their dashboard and their
teacher's.

It runs on Firebase's **free Spark plan**. There is nothing to install and no
Cloud Functions. Setup is all done in the Firebase website and takes about
20 minutes.

You can click through everything **before** setting up Firebase: see
"Try it first" near the end.

---

## How sign-in works

- **The teacher** signs in with a **teacher code** (currently `MAH26`). There
  is one teacher account. Behind the scenes the code is the password of a
  Firebase account you create yourself in the Firebase Console (step 6).
- **Students** sign in with the **8-character code** their teacher gives them
  (printed on login cards). No email or password.
- The security rules (`firebase/firestore.rules`) make sure a teacher only ever
  sees and changes their own students, classes, tasks and results, and a
  student only sees their own results and their own class's tasks.

## What's stored, and who can see it

| Collection | One document per | Fields | Who can read it |
|---|---|---|---|
| `teachers` | teacher (document ID = their Firebase user ID) | `teacherName`, `school`, `active` | That teacher. |
| `students` | student (document ID = their login code) | `firstName`, `surname`, `name`, `className`, `teacherCode`, `teacherName`, `school`, `active` | Their own teacher, or anyone who types that exact code. |
| `sessions` | signed-in student device | `studentCode` | That device only. |
| `classes` | class | `name`, `teacherCode`, `active` | Its teacher. |
| `tasks` | quiz set for a class | `className`, `toolId`, `title`, `dueAt`, `active` | Its teacher, and students in that class. |
| `achievements` | finished quiz | `studentCode`, `studentName`, `className`, `teacherCode`, `toolId`, `topic`, `score`, `total`, `percent`, date | The student who earned it, and their teacher. |

- Only a **score** is saved, never what the student typed.
- No student emails, passwords, birthdays or student numbers are collected.
- `teacherCode` holds the teacher's Firebase user ID. It isn't secret.
- **A student's code is their password.** Anyone with the code can see that
  student's name, class and results, so treat login cards like passwords. If a
  card is lost, switch that code off in *Students & classes* and add the
  student again to get a new code.
- To keep personal information to a minimum, consider entering students as
  **first name + surname initial** (e.g. "Ava T").
- Because this holds student names and results, check with your school about
  any privacy requirements before using it with a class.

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**
   (or open the project you already have). Google Analytics is optional.
2. Stay on the free **Spark** plan.
3. **Build → Firestore Database → Create database.**
   - Location: **australia-southeast1 (Sydney)**. This keeps student data in
     Australia. *It cannot be changed later.*
   - Start in **production mode** (the rules in this folder replace the defaults).

## 2. Turn on the two sign-in methods

**Build → Authentication → Get started → Sign-in method**, then enable:

1. **Email/Password** (for teachers). Leave "Email link" off.
2. **Anonymous** (for students; this is what lets a student sign in with just a code).

Leave **Settings → User actions → "Enable create (sign-up)"** ticked: students
need it to sign in anonymously. Strangers who make an account get nothing,
because an account is only a teacher once you add it in step 6.

## 3. Connect the site to your project

1. Firebase Console → ⚙ **Project settings** → **General** → *Your apps* →
   click the **`</>`** (Web) icon → give it a nickname → **Register app**
   (leave "Firebase Hosting" unticked).
2. It shows a `firebaseConfig = { ... }` block. Open
   **`assets/js/portal/config.js`** in the maths-hub folder and paste those
   values into `FIREBASE_CONFIG`. These values are public by design: they
   identify the project, they don't unlock it.

## 4. Allow your website's address

**Authentication → Settings → Authorised domains → Add domain**, and add the
address the site is served from, for example `helenfmahony-wq.github.io` for
GitHub Pages. (`localhost` is already there for testing.)

## 5. Publish the security rules

Firebase Console → **Firestore Database → Rules**. Delete what's there, paste
in the whole of `firebase/firestore.rules`, and click **Publish**.

Do this again whenever `firestore.rules` changes.

## 6. Create the teacher account

The teacher code you type on the sign-in page (`MAH26`) is turned into the
password of one Firebase account: the password is `mathshub-` followed by the
code. (Firebase passwords must be at least 6 characters, hence the prefix.)

1. **Authentication → Users → Add user.**
   - Email: `teacher@helen-maths.app` (it doesn't need to be a real inbox)
   - Password: `mathshub-MAH26`
2. Copy the **User UID** shown in the list (a long string like `Xy12AbC...`).
3. **Firestore Database → Start collection** (or **+ Add document** if
   `teachers` already exists):

   | Setting | Value |
   |---|---|
   | Collection ID | `teachers` |
   | Document ID | **the User UID you copied** |

   Then add these fields:

   | Field | Type | Value |
   |---|---|---|
   | `teacherName` | string | Ms Mahony |
   | `school` | string | Your school's name |
   | `active` | boolean | true |

Tip: if you sign in before doing step 3, the sign-in page shows the User UID
in its message, ready to copy.

**If the code is ever leaked,** set `active` to `false` on the teachers
document. That locks the teacher portal straight away. The Firebase Console
can't edit a password directly, and your data is linked to the account's User
UID, so changing the code takes a few extra steps. Ask for help when you need to.

### About the short code

`MAH26` is short, and the site is public, so the code is the only thing
protecting your students' names and results. Firebase slows down and then
blocks repeated wrong guesses, which helps a lot, but a short code is still
easier to guess or to spot over your shoulder than a long one. To make it
stronger at any time, pick a longer code (10+ letters and numbers) and change
the password as above.

## 7. Put the site online

The portal needs to be served from a web address (not opened by
double-clicking the file), because it loads Firebase over the internet.

**GitHub Pages:** commit and push as usual. Everything uses relative links, so
`https://helenfmahony-wq.github.io/maths-hub/` works as-is. Make sure that
domain is in Authorised domains (step 4).

## 8. Try it end to end

1. Open the home page → **Log in** → **I'm a teacher** → enter the teacher code `MAH26`.
2. **Add a class** (e.g. `9MA1`) → **Add students** (add yourself as a test
   student) → note the code.
3. **Set a task**: tick *Rise & Run: Gradient Quiz*.
4. In another browser (or a private window), go to **Log in** → **I'm a
   student** → sign in with the student code → **Start** the task → finish a level.
5. Back on the teacher dashboard press **Refresh**. The result is there, and
   *Manage tasks* shows 1 done.

---

## Try it first: demo mode

Demo mode runs the whole portal in your browser with made-up data. Nothing
goes to Firebase. It still needs a local web server, so in PowerShell:

```powershell
cd $HOME\Documents\GitHub\maths-hub
python -m http.server 8000
```

(or use the **Live Server** extension in VS Code). Then open:

- Teacher: <http://localhost:8000/portal/teacher/index.html?demo>, teacher code **DEMO**
- Student: <http://localhost:8000/portal/student/index.html?demo>, student code **AVA234**

The blue bar at the top has **Reset demo data** and **Leave demo**.

---

## Connecting a new quiz

Any quiz page can save results. `portal/quiz-template.html` is a complete
working example to copy. **Every student quiz must do all four of these**, so
that it saves to the dashboards and has a working **Submit my work** button:

1. **An entry in `assets/js/portal/toolRegistry.js`:**

   ```js
   {
     toolId: "fractions-basics",   // permanent id: never change it once results exist
     title: "Fractions Basics",
     topic: "Fractions, decimals and percentages",
     stage: "Stage 4",
     path: "tools/number-algebra/fractions-decimals-percentages/fractions-basics/index.html",
     enabled: true,
   },
   ```

2. **The sign-in script as the last line before `</body>`.** From a tool at
   `tools/<strand>/<focus-area>/<tool>/` that is:

   ```html
   <script src="../../../../assets/js/portal/quizSignIn.js"></script>
   ```

   It shows a "Student code" box with a **Skip** button, so the quiz still
   works for guests. When a student opens a quiz from their dashboard they're
   signed in automatically. It also adds the **Submit my work** button next to
   the "Signed in as…" chip.

3. **Report progress after every answered question** (and once with
   `answered: 0` when an attempt starts or restarts):

   ```js
   PlatformProgress({ toolId: "fractions-basics", score: 3, answered: 4, total: 10, topic: "Fractions, decimals and percentages" });
   ```

   The Submit button stays greyed out until the first answer. When a student
   presses it, their score so far is saved and shows on both dashboards as
   "submitted early (4 of 10 answered)". They can keep going afterwards.

4. **One call when the student finishes:**

   ```js
   PlatformSave({ toolId: "fractions-basics", score: 7, total: 10, topic: "Fractions, decimals and percentages" });
   ```

Optional: put `<span id="signInSlot"></span>` in the quiz's header to place
the chip and Submit button there (otherwise they float top-right). See the
Rise & Run quiz for a real example.

---

## Free plan limits

The Spark plan allows 50,000 database reads and 20,000 writes per day, and
1 GB of storage. A teacher opening their dashboard reads roughly one document
per student, result and task, so a few classes using it daily stays well
inside this. If a limit is ever reached, the portal stops working until the
next day (nothing is lost, and there is no charge).

## Troubleshooting

| What you see | What to do |
|---|---|
| Yellow "Not connected to Firebase yet" bar | Paste your details into `assets/js/portal/config.js` (step 3). |
| "This sign-in method isn't switched on yet" | Step 2: enable Email/Password and Anonymous. |
| "That code isn't right" | Check the code, and that the account `teacher@helen-maths.app` exists with password `mathshub-` + the code (step 6). |
| "This account isn't set up as a teacher yet" | Step 6.3: the `teachers` document ID must be that account's User UID exactly. |
| "Signed in, but couldn't load your data" or "The database refused that" | Publish the latest rules (step 5). |
| Sign-in fails on the live site but works on localhost | Add the site's domain under Authorised domains (step 4). |
| Nothing happens / blank page when opened by double-clicking | Open it through a web address instead (step 7, or the local server above). |
| A student moved class can't save results | They need to sign in again so their new class is picked up. |

## Good habits

- Keep login cards private. Switch off any code that's been lost or shared.
- Never loosen `firestore.rules` to "allow read, write: if true", even for
  testing. That would open every student's data to anyone.
- Never save typed answers or other personal information in results. A score is enough.
- When you edit `firestore.rules`, check it in the console's **Rules
  Playground** before publishing.
