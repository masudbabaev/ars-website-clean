# Azerbaijan Research Society website — V38.1

V38.1: membership buttons go to the contact form, SVG program icons, consistent instructor names and the `.nojekyll` file. See CHANGELOG.md.

V37.1 removes all 11 unverified publication entries. The 20 verified entries, existing academic-profile links and all board portraits remain. No pending notices or blank cards appear. The audit file is historical editorial documentation.

V37 uses explicit publication metadata in drawers and profile pages, and generates every board-preview portrait from board membership (15 Scientific; 7 Executive). See PUBLICATION-AUDIT.md for verified corrections and unresolved references. Run `node tools/check-publications.cjs` after rebuilding. This package has not been deployed automatically. GitHub write access was denied to the connected integration; no draft pull request was created.

Bilingual Azerbaijani/English static website for https://azresearchsociety.org/.

## Deploy the supplied package

GitHub Pages publishes the prebuilt files from `main` at the repository root. Upload the contents of this package’s `ars-website` folder to the repository root and commit to deploy. Do not nest that folder inside the repository. Keep `CNAME` and `.nojekyll`. No Netlify configuration is used. The `/departments`, `/projects` and `/join` aliases use static redirect pages. The custom domain remains `azresearchsociety.org`.

## Preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/. Preview through a web server: generated pages use root-relative URLs.

## Projects

See [docs/PROJECTS.md](docs/PROJECTS.md) for the data model, approvals, fields, roles, statuses and proposal review process. No real project records have been supplied, so the public catalogue starts empty. The proposal action is available and the counters accurately show only published catalogue entries.

```bash
python3 tools/build-projects.py
```

Rebuilding needs Python 3 and Node.js, with no third-party dependencies. The build reads one JSON record per project under `data/projects/`; `data/project.example.json` is an excluded template, not a public project. Only approved public information belongs in those files. Profiles reuse the supplied source in `script.js`. Generated project/people/join pages share `templates/header.html` and `templates/footer.html`; the directory uses `templates/profile-dialog.html` for quick profiles.

## Main files

- `index.html`, `about.html`, `programs.html`, `workshop.html`, `contact.html`: existing content and workshop resources.
- `projects.html`, `projects/`, `join.html`: generated project catalogue, details and participation flow.
- `people.html`, `people/`, board pages: people directory, individual profile URLs and governance boards.
- `styles.css`, `script.js`: established visual system and behavior.
- `projects.css`, `projects.js`, `project-data.js`: project styles, progressive interactions and generated public catalogue.
- `assets/`: existing logo, portraits, workshop slides and calendar.
- `.nojekyll`, `CNAME`, `route-redirect.js`, `robots.txt`, `sitemap.xml`: GitHub Pages hosting, redirects and indexing.
- `CHANGELOG.md`: release history.

## Forms and publication

Contact and project intake use the existing Formspree endpoint `xljdgezl`. New proposals are reviewed in that inbox and manually published only after description/team/output approval. There is no automatic acceptance or publication. No test submissions were sent. Workshop registration still uses its existing Google Form.

## Validation and limitations

V36 is checked for JavaScript syntax, HTML nesting and duplicate IDs, local assets and fragments, bilingual keys, build reproducibility, approved/draft separation, all four project statuses, profile links, and archive integrity. Fixture projects are isolated outside the deliverable. A browser is not installed in this workspace and its download was blocked, so rendered desktop/mobile and assistive-technology review remains outstanding. Verify the form service configuration after deployment; QA does not contact the live inbox.

The existing custom domain is retained on GitHub Pages. Existing biographies, workshop resources and governance titles are retained. Orkhan Jafarli’s portrait is replaced by the supplied `orxanc.png`. Seven new members have bilingual profiles and supplied portraits: Aytən Mərdanova, Orxan Rəfiyev, Ali Madayen, Natiq Soltanov, Şamxal Baybekov, Sənan Göyüşlü and Elşən Abdullayev. All seven are Scientific Advisory Board members. The Executive Board remains a separate seven-person board; the Scientific Advisory Board has 15 people, including its head, Amil Aligayev. The People directory displays the two boards in separate labeled groups. No project assignments have been inferred. There are 22 permanent profile pages, including `/people/ibrahim/`. Only the 20 verified publication records are displayed; 11 unverified records have been omitted at the owner’s request.

## V38 usability updates

Empty project statistics are hidden until the catalogue has approved projects and the build runs again. Empty-catalogue hero actions go to membership, mentoring and partnership contact topics. Each homepage board shows six people, with links to all members. The People overview retains every board portrait as requested and links to the separate board pages; its searchable directory is grouped by board. Both translation data formats use the same engine in `script.js`. Programs no longer loads project scripts just to translate text. Social sharing uses an Azerbaijani 1200×630 card.

## Replacing older repository contents

After uploading V38, delete `_headers` and `_redirects` from the repository. You may also delete the four unreferenced `assets/department-ai.svg`, `assets/department-engineering.svg`, `assets/department-humanities.svg` and `assets/department-life.svg` files left over from old releases. Do not delete `departments/`, `departments.html`, `join/`, `projects/`, `people/`, `CNAME` or `.nojekyll`: these are required routes or hosting files. Keep `data/`, `docs/`, `templates/` and `tools/` as the editing source.

On macOS use Command+Shift+period to reveal `.nojekyll`, or create an empty `.nojekyll` at the repository root in GitHub. Verify the README heading says V38 and `people.html` loads `script.js?v=38` after committing.
