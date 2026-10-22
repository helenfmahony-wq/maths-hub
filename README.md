# Maths Hub

Interactive maths teaching tools and student practice for NSW Stages 4–5 (Stage 6 to come).
Plain HTML, CSS and JavaScript. There is no build step, so any page can be opened straight from the folder.

## Folder layout

```
index.html               Home page
teacher-tools.html       Teacher Tools listing
student-practice.html    Student Practice listing
assets/
  css/styles.css         Shared styles for the listing pages
  js/filter.js           Stage filter buttons on the listing pages
  images/                Shared images, such as the logo
tools/
  number-algebra/
  measurement-space/
  statistics-probability/
    <tool-name>/
      index.html         The tool itself (self-contained)
      ...                Any files that belong to this tool only
_archive/                Old material kept for reference (not published)
```

Tools are grouped by the three NSW syllabus strands. Stage is not a folder.
It is set on each listing card (`data-stage="4"`), so one tool can serve more than one stage.

## Adding a new tool

1. Make a folder at `tools/<strand>/<tool-name>/`. Use lowercase with hyphens, for example `tools/number-algebra/ratio-tables/`.
2. Put the tool's page in that folder as `index.html`. Put any files that belong only to this tool in the same folder.
3. Add a card to `teacher-tools.html` and/or `student-practice.html` under the matching strand.
   Link to the tool by its full path, for example `tools/number-algebra/ratio-tables/index.html`, and set `data-stage`.

Link to `.../index.html` rather than to the folder alone, so links still work when a page is opened straight from the folder on a computer.
