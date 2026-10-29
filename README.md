# Smart Lesson Planner

A mobile lesson-plan generator for Filipino teachers, built with Expo/React
Native. Supports ILAW, Detailed, and Semi-Detailed lesson plan formats, with
offline-first local storage, optional cloud backup, and an optional AI-assist
drafting feature.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────┐
│   Mobile App (RN)    │        │   Backend (Express)   │        │  MongoDB    │
│                      │───────▶│                        │───────▶│  Atlas      │
│  - MongoDB sessions  │        │  - MongoDB auth + CRUD │        └─────────────┘
│  - SQLite / IndexedDB│        │                        │
│  - PDF export/share  │        │  - Lesson plan CRUD    │        ┌─────────────┐
│  - Rule-based        │        │  - AI proxy            │───────▶│ NVIDIA NIM  │
│    activity bank     │        │                        │        │ (OpenAI-    │
└─────────────────────┘        └──────────────────────┘        │ compatible) │
                                                                  └─────────────┘
```

**Why a backend at all, instead of calling things directly from the app?**
Both your MongoDB connection string and your AI API key grant full access to
real resources (your database, your AI account's billing). A compiled mobile
app can be decompiled and any string baked into it extracted — so neither
secret can live in the app. The backend holds both secrets and the app only
ever talks to your backend over HTTPS.

**Why local storage instead of just the cloud?** The features template
requires offline access — creating, viewing, editing, searching, and
deleting lesson plans without an internet connection. SQLite on mobile and
IndexedDB on web are the source of truth; MongoDB is a best-effort backup that
syncs quietly whenever the app is online. If a sync fails, nothing is lost
locally.

## Project layout

```
app/                    Screens (Expo Router file-based routing)
  index.tsx             Splash screen
  (auth)/               Login, Register
  (app)/                Dashboard, My Plans, Profile, Settings (tab group)
  create/                Setup -> Activities -> Editor -> Preview (wizard)
  plan/[id].tsx          View/edit a saved plan
lib/                    Business logic, shared by every screen
  types.ts              LessonPlanCore data model + dropdown option lists
  auth.tsx               MongoDB session auth context
  db.ts                  Native SQLite persistence (save/search/filter/delete)
  db.web.ts              Browser IndexedDB persistence
  api.ts                 Backend client (cloud sync + AI generation)
  template-pdf.ts        Fill uploaded lesson-plan PDF templates
  activityBank.ts        Rule-based activity suggestion engine
  pdf.ts                 PDF export + native share
  validation.ts / errors.ts   Form validation + user-friendly error messages
components/             Reusable UI (form fields, lesson plan preview)
server/                 Node/Express backend — deploy this separately
```

## One-time setup

You need a MongoDB database and, if using AI drafting or curriculum-PDF
competency extraction, an NVIDIA NIM API key.
**If you pasted any real credentials into a chat while
building this, rotate them now before going further** — anything shared in a
conversation should be treated as compromised.

### 1. MongoDB Atlas

1. In Atlas, **Database Access** — make sure your database user's password
   is one only you know (rotate it if it was ever pasted anywhere outside a
   local `.env` file).
2. **Network Access** — while developing, add your current IP (or
   `0.0.0.0/0` temporarily for convenience, then tighten it before sharing
   the project).
3. Copy your connection string from **Database > Connect > Drivers**.

### 2. Backend server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

- `MONGODB_URI` — your real connection string from step 1, with the password
  filled in.
- `ADMIN_EMAILS` — comma-separated emails permitted for admin provisioning.
- `NVIDIA_API_KEY` — your key from [build.nvidia.com](https://build.nvidia.com).
- `NVIDIA_MODEL` — any chat model listed on build.nvidia.com that supports
  the `/chat/completions` endpoint (the default in `.env.example` works out
  of the box).

Then install and run it:

```bash
npm install
npm run dev
```

You should see `Smart Lesson Planner API listening on port 5000`. Leave this
running in its own terminal.

New accounts are stored in MongoDB. Passwords are hashed with bcrypt, and
only hashes of random, revocable session tokens are stored. To create an
admin account, first add its email to `ADMIN_EMAILS`, then run from `server/`:

```bash
npm run create-admin -- admin@example.com
```

The generated password is printed once. Save it securely and change it after
the first login if you add a password-change flow.

PDF exports are archived in MongoDB GridFS and downloaded locally for sharing.
Existing Firebase accounts cannot be migrated because their passwords are
not available to this app; users must register new MongoDB accounts.

The dashboard's Upload Template shortcut accepts lesson-plan PDFs. Fillable
PDF text fields can be mapped to lesson-plan values and reused; flat PDFs use
a visual drag-to-place mapper. Template files and mappings stay in local
SQLite on mobile and browser IndexedDB on web, and completed templates are
filled on-device. The flat-PDF preview
loads PDF.js from a CDN while mapping, so that step needs internet access.
During setup, a text-based curriculum-guide PDF can be sent to the authenticated
backend to extract competency suggestions using the configured NVIDIA AI
provider. Scanned PDFs/OCR are not supported; extracted competencies should be
reviewed before continuing.

### 4. Mobile app

```bash
# from the project root, not server/
npm install
npx expo start
```

If you're testing on a physical phone with Expo Go, `localhost:5000` in
`app.json`'s `extra.apiUrl` won't reach your computer's backend — change it
to your computer's LAN IP instead (e.g. `http://192.168.1.23:5000`), and make
sure your phone is on the same Wi-Fi network.

## What's real vs. what's a stub

Everything in this app is fully wired and functional given valid
credentials:

| Feature                                 | Status                                   |
| --------------------------------------- | ---------------------------------------- |
| MongoDB email/password auth             | Real — needs the backend running         |
| Local lesson plan storage (SQLite)      | Real, works fully offline                |
| Rule-based activity suggestions         | Real, works fully offline, no API needed |
| Cloud backup and PDF archive to MongoDB | Real — needs your backend running        |
| AI-assisted drafting                    | Real — needs your backend + NVIDIA key   |
| PDF export & native share               | Real                                     |
| Reusable fillable/flat PDF templates    | Real — template processing is on-device |
| Curriculum PDF competency extraction    | Real — needs backend + NVIDIA key; text PDFs only |
| Search / filter / categories            | Real                                     |

Things intentionally left for you to decide/add later:

- Profile fields (school, grade level taught) are UI-only placeholders —
  wire them to a `users` collection in MongoDB if you want them to persist.
- Push notifications, dark mode, and multi-language support aren't in scope
  of the features template and weren't built.

## Common issues

- **Registration or login fails** — check the backend terminal and confirm
  `server/.env` has a valid `MONGODB_URI`.
- **AI draft button fails** — check the backend terminal for the actual
  error. Usually a missing/invalid `NVIDIA_API_KEY`, or the model name in
  `NVIDIA_MODEL` isn't available on your account.
- **Cloud sync silently doesn't happen** — this is by design (offline-first);
  check the backend terminal for `[lesson-plans]` errors. Local save/search/
  delete will keep working regardless.


## Draft recovery and focused editing

Unfinished work is saved on this device after every change, in a recovery store
separate from explicitly saved lesson plans. SQLite is used on mobile and
IndexedDB on web. Recovery is scoped to the signed-in account and includes the
last workflow step and selected PDF template. Home shows **Continue lesson**.
Starting another lesson moves unfinished content into **My Plans** as a draft;
opening the same plan again retains its unsaved edits. An explicit save clears
the recovery record. Autosave errors remain visible with a **Retry** action.
Recovery is local; this does not add cloud autosave or cross-device recovery.

The editor uses expandable sections with a shared step indicator and a persistent
**Continue to review** button. **Save & exit** returns to Home after flushing the
latest local recovery write. Earlier steps remain editable from the step header.

**Suggest with AI** previews a suggestion for the open section without changing
its content. **Accept suggestion** changes only that section. **Keep original**
dismisses the suggestion. **Undo accepted suggestion** restores the prior text
within the editor session; it becomes unavailable if the teacher subsequently
edits the accepted text, to avoid overwriting newer work. AI requests still need
the configured backend and internet connection. All original fields remain
available for Detailed, Semi-Detailed, and ILAW plans.

Recovery and field-isolation regression checks:

```bash
node --test tests/draft-recovery.test.cjs
```


## Grade-based learning areas

Setup requires a grade before the Learning Area picker can open. Reference lists
are maintained in `lib/learning-areas.ts`: MATATAG K-10 learning areas, the five
Strengthened SHS Grade 11 core subjects, and a separately labelled legacy SHS
core reference catalog for Grade 12. The Grade 12 reference is **not** a verified
school timetable. Schools schedule legacy core subjects across Grades 11/12,
and Strengthened Grade 12 electives vary by school. Populate
`SCHOOL_SHS_OFFERINGS` with approved grade-specific electives/offerings rather
than putting them in every grade's list. Confirm your school's curriculum and
implementation year before deployment; these catalogs do not infer phased
rollout status from today's date.

Changing to a grade where the current learning area is not listed asks for
confirmation. Cancel retains the current grade and subject. Confirm clears
only the invalid subject; lesson text, competencies, objectives, activities,
ILAW fields and teaching notes are retained. Existing content is marked for
teacher review, including when a compatible subject remains selected. The
review flag survives recovery, SQLite/IndexedDB saves, and cloud backups, and
must be acknowledged in Setup before completing or exporting the edited plan.
Old subject names are not automatically renamed or deleted. My Plans filters
include actual saved subject names so historical plans remain accessible.

Reference sources:

- [MATATAG curriculum guides](https://www.deped.gov.ph/matatagcurriculumk147/)
- [Key Stage 1 learning areas, DO 020 s. 2025 Annex C](https://www.deped.gov.ph/wp-content/uploads/DO_s2025_020r_8.pdf)
- [Strengthened SHS program](https://www.deped.gov.ph/strengthened-shs-program/)
- [Legacy SHS core subjects, DepEd school resource portal](https://sites.google.com/deped.gov.ph/dnhs-shs/core-subjects)

Run the mapping and content-preservation regression checks:

```bash
node --test tests/learning-areas.test.cjs tests/draft-recovery.test.cjs
```


## Classic School PDF exports

The standard **Export PDF & Share** action now creates an A4 portrait lesson
plan in a monochrome Classic School layout: a centered plan type and title,
a bordered teacher/class metadata grid, and numbered section rows with gray
label cells. Long sections continue across pages with repeated class details,
continuation labels, and page-number footers. Text is kept at a readable size
rather than reduced to fit a single page. Activity durations and materials are
included, and ILAW fields appear only for ILAW plans.

`lib/pdf-classic.ts` builds shared page geometry for mobile and web. Web draws
searchable text and vector borders with jsPDF; mobile prints the same geometry
as vector HTML/SVG through Expo Print. Serif font substitutions can differ
slightly between devices, so the text wrapping reserves extra width. The
uploaded-template export remains a separate action using the teacher's PDF.

```bash
node --test tests/pdf-classic.test.cjs
```
