# Maths Hub

Interactive maths teaching tools and student practice, organised to match the
NSW Mathematics K–10 Syllabus (2022). It covers Stages 4–5 now, with Stage 3 and Stage 6 to come.
Plain HTML, CSS and JavaScript. There is no build step, so any page can be opened straight from the folder.

## Folder layout

```
index.html               Home page
teacher-tools.html       Teacher Tools listing
student-practice.html    Student Practice listing
assets/
  css/styles.css         Shared styles for the listing pages
  css/portal.css         Styles for the login portal and dashboards
  js/filter.js           Stage filter buttons on the listing pages
  js/portal/             Portal code: Firebase settings (config.js), quiz list
                         (toolRegistry.js), sign-in and result saving.
                         Runs on Firebase's free Spark plan.
portal/
  index.html             "Log in" landing page: I'm a student / I'm a teacher
  teacher/index.html     Teacher dashboard: students, login cards, tasks, results
  student/index.html     Student dashboard: tasks and results
  quiz-template.html     Working example of a quiz that saves results
firebase/                Firebase back end (not published as part of the site)
  SETUP.md               Step-by-step Firebase setup
  firestore.rules        Security rules
firebase.json            Tells the Firebase CLI what to deploy
tools/
  <strand>/
    <focus-area>/
      <tool-name>/
        index.html       The tool itself (self-contained)
        ...              Any files that belong to this tool only
_archive/                Old material kept for reference (not published)
```

Tools follow the syllabus: **strand → focus area → tool**.
Stage is not a folder. A focus area such as Equations runs through Stage 4 and Stage 5, so one folder
holds tools for both. Each tool's stage is set on its listing card (`data-stage="4"`), and the card's
tag names the focus area.

## Syllabus map

Only create a focus-area folder when its first tool is added. Use these exact folder names.

### number-algebra (Number and algebra)

| Folder | Syllabus focus area | Stage |
|---|---|---|
| represents-numbers | Represents numbers | 3 |
| additive-relations | Additive relations | 3 |
| multiplicative-relations | Multiplicative relations | 3 |
| representing-quantity-fractions | Representing quantity fractions | 3 |
| computation-with-integers | Computation with integers | 4 |
| fractions-decimals-percentages | Fractions, decimals and percentages | 4 |
| ratios-and-rates | Ratios and rates | 4 |
| financial-mathematics | Financial mathematics | 5 |
| algebraic-techniques | Algebraic techniques | 4, 5 |
| indices | Indices (Stage 5: Indices and surds) | 4, 5 |
| equations | Equations | 4, 5 |
| linear-relationships | Linear relationships | 4, 5 |
| non-linear-relationships | Non-linear relationships | 5 |
| variation-and-rates-of-change | Variation and rates of change | 5 (Path) |
| polynomials | Polynomials | 5 (Path) |
| logarithms | Logarithms | 5 (Path) |
| functions-and-other-graphs | Functions and other graphs | 5 (Path) |

### measurement-space (Measurement and space)

| Folder | Syllabus focus area | Stage |
|---|---|---|
| geometric-measure | Geometric measure | 3 |
| two-dimensional-spatial-structure | Two-dimensional spatial structure | 3 |
| three-dimensional-spatial-structure | Three-dimensional spatial structure | 3 |
| non-spatial-measure | Non-spatial measure | 3 |
| length | Length | 4 |
| right-angled-triangles | Right-angled triangles (Pythagoras' theorem) | 4 |
| area | Area (Stage 5: Area and surface area) | 4, 5 |
| volume | Volume | 4, 5 |
| angle-relationships | Angle relationships | 4 |
| properties-of-geometrical-figures | Properties of geometrical figures | 4, 5 |
| numbers-of-any-magnitude | Numbers of any magnitude | 5 |
| trigonometry | Trigonometry | 5 |
| circle-geometry | Circle geometry | 5 (Path) |
| networks | Introduction to networks | 5 (Path) |

### statistics-probability (Statistics and probability)

| Folder | Syllabus focus area | Stage |
|---|---|---|
| data | Data | 3 |
| chance | Chance | 3 |
| data-analysis | Data classification, visualisation and analysis (Stage 4); Data analysis (Stage 5) | 4, 5 |
| probability | Probability | 4, 5 |

Stage 6 (Years 11–12) uses separate syllabuses: Mathematics Standard, Advanced and Extension.
When Stage 6 tools are added, give them a top-level `tools/stage-6/<course>/<topic>/` branch.

## Current tools

| Tool | Path | Stage |
|---|---|---|
| Equation Models | tools/number-algebra/equations/equation-models/ | 4 |
| Rise & Run (+ quiz.html) | tools/number-algebra/linear-relationships/rise-and-run/ | 5 |
| Which Is Bigger? | tools/measurement-space/numbers-of-any-magnitude/which-is-bigger/ | 5 |
| Quadrilateral Lab | tools/measurement-space/properties-of-geometrical-figures/quadrilateral-lab/ | 4 |
| Chance Lab | tools/statistics-probability/probability/chance-lab/ | 4 |
| Hi-Low Predictions | tools/statistics-probability/probability/hi-low-predictions/ | 4 |
| Quartiles & IQR Explorer | tools/statistics-probability/data-analysis/quartiles-iqr-explorer/ | 5 |

## Adding a new tool

1. Find the tool's focus area in the syllabus map above. Make a folder at `tools/<strand>/<focus-area>/<tool-name>/`, using lowercase with hyphens.
2. Put the tool's page in that folder as `index.html`. Put any files that belong only to this tool in the same folder.
3. Add a card to `teacher-tools.html` and/or `student-practice.html` under the matching strand.
   Link to the tool by its full path ending in `index.html`, set `data-stage`, and use the focus-area name as the card's tag.

Link to `.../index.html` rather than to the folder alone, so links still work when a page is opened straight from the folder on a computer.

## Login portal and saving quiz results

The **Log in** button on every page opens `portal/index.html`. Teachers sign in
with the teacher code to create student logins, print login cards, set
quizzes and see results. Students sign in with their 8-character code to see
their tasks and results.

To make a quiz save to student dashboards, add it to
`assets/js/portal/toolRegistry.js`, include `assets/js/portal/quizSignIn.js` at
the end of the page, and call `PlatformSave({ toolId, score, total, topic })`
when the student finishes. Full steps, and the one-off Firebase setup, are in
[firebase/SETUP.md](firebase/SETUP.md).

The portal must be opened through a web address (the live site, or a local
server), not by double-clicking the file.
