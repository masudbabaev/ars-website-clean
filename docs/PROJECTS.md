# Adding approved projects

The launch catalogue is intentionally empty. No project, team assignment, output or recruitment claim was invented. Existing biographies and governance titles remain unchanged.

## One public record per project

Copy `data/project.example.json` into `data/projects/your-slug.json`. All title, question, summary, why, method, role, skill and update text uses `{ "az": "…", "en": "…" }`. File content must be suitable for public release. **Never put confidential drafts, review notes, applications or unpublished methods in this repository.** Netlify blocks requests to `/data/`, `/tools/` and `/templates/`, but a source repository or deployment archive is not private storage.

Obtain approval for the public description, all named team members and any linked outputs. Then set `public: true` and all three `approval` values to `true`. The build omits non-public records and rejects public records missing approval. This is a manual editorial gate, not an authentication system.

Run from the website folder:

```bash
python3 tools/build-projects.py
python3 -m http.server 8080
```

Python 3 and Node.js are required to rebuild; no package installation is needed. The supplied ZIP is already built and deploys without a build step. The generator reads the existing profile definitions in `script.js` through `tools/export-people.cjs`, avoiding a second biography source.

The build creates the listing, project details, 22 profile permalinks, join flow, public JS catalogue, sitemap and homepage sections. Navigation/footer partials for generated pages are in `templates/`. The rest of the existing site remains static. Regenerate after editing projects or biographies.

## Status and visibility rules

| Value | Stage | Action |
| --- | --- | --- |
| `proposed` | Idea | Give feedback |
| `recruiting` | Develop | Apply to a role |
| `active` | Collaborate | Follow updates |
| `completed` | Publish | Read outputs |

Only recruiting projects may have open roles. Completed projects must link at least one output. Counts include approved, public project records only; they are not claims about all ARS activities. Active teams counts projects with `status: active`.

Fields: `engineering`, `life`, `data`, `humanities`, `other`. They are neutral tags, not departments. `institutions` lists explicitly confirmed project affiliations or hosts; do not infer them from a member's employer. It can be empty.

The lead must be a team member. Existing person IDs: `amil`, `azizeh`, `sabrin`, `xedice`, `gehreman`, `ulkar`, `nijat`, `orkhan`, `ibrahim`, `masud`, `xeyranse`, `humay`, `jale`, `nargiz`, `zehra`, `ayten-merdanova`, `orxan-refiyev`, `ali-madayen`, `natiq-soltanov`, `shamxal-baybekov`, `senan-goyushlu`, `elshen-abdullayev`. Team assignments never replace society governance titles.

## Optional collections

An open role has a unique `id` within the project, bilingual `title`, `commitment`, `description`, a `skills` array of bilingual labels, and `career_stages` drawn from `student`, `early`, `experienced`:

```json
{
  "id": "analyst",
  "title": {"az": "Analitik", "en": "Analyst"},
  "commitment": {"az": "Həftədə 3 saat", "en": "3 hours per week"},
  "description": {"az": "Təsdiqlənmiş rol təsviri", "en": "Approved role description"},
  "skills": [{"az": "Statistika", "en": "Statistics"}],
  "career_stages": ["student", "early"]
}
```

Milestones and updates: `{ "date": "2026-10-07", "text": { "az": "…", "en": "…" } }`. Dates must be valid ISO calendar dates; only publish factual milestones and updates. An output needs bilingual `title`, `type` (`paper`, `preprint`, `dataset` or `report`) and a real `doi` or HTTPS `url`. DOI links use existing publication-card styling.

## What the constellation means

Each project cover has one node per named team member, linked to a central project node. These lines indicate project membership, not claimed coauthorship or direct collaboration between every pair. The network view uses one node per person, so shared team members connect multiple projects. The list remains available, with equivalent links below the network for keyboard and screen-reader access. Covers are deterministic SVGs, not generated photographs.

## Intake and review

`join.html` offers Join a project / Propose a project / Learn first. Open roles can be filtered by field and career stage. Join and proposal forms use the existing Formspree endpoint `xljdgezl`. Configure its domain, recipient and spam settings in the existing account. Submission is not automatic acceptance or publication.

The proposal form separates the public description from the method supplied for review. Review submissions in the existing Formspree inbox, obtain visibility approval, then add the approved public record manually as Proposed. Change to Recruiting only when the lead and roles are ready. This release does not add an admin console, database, mailing-list subscription or automated workflow. Do not copy the full application into public data.

Forms retain native HTML submission without JavaScript; all three linked sections are then visible. With JavaScript, only the selected branch is shown and validation errors appear inline. No submissions were sent during QA.

## URLs and deployment

- Listing: `/projects.html`; `/projects` uses a static GitHub Pages redirect.
- Details: `/projects/project-slug/`.
- Profiles: `/people/person-id/`.
- Join: `/join.html`; `/join` uses a static GitHub Pages redirect.
- Old `/departments` and `/departments.html` redirect to Projects. A static fallback page also redirects.
- Homepage `#departments` remains a compatibility anchor at Featured projects, and JavaScript updates it to `#projects`.

Keep `.nojekyll`, `CNAME` and `route-redirect.js` in the deployment root. Upload the contents of the ZIP's `ars-website` folder, not the ZIP itself. If your Git upload does not delete removed files, delete the four old `assets/department-*.svg` files; they are no longer referenced. After later removals, delete retired project directories in the repository as well.
