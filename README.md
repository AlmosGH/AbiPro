# Geschichte Érettségi Trainer

A SvelteKit-based web app for preparing for the Hungarian **középszintű történelem érettségi** in German.

The app focuses on the short-answer section of past exams and does not include essays.

## Features

### Aufgaben

Browse past exam tasks and filter them by:

* Exam year/session
* Historical period
* Topic
* NAT 2020 / 2012 / 2007

### Üben

Practice a randomly selected task. Optionally focus on tasks you haven't practiced before, or 

Answers are graded automatically:

* Multiple choice, matching and similar questions use deterministic grading.
* Open-text answers can be evaluated using AI against the official answer key and marking criteria.

### Prüfung

Take a simulated exam consisting of 12 randomly selected tasks.

Includes:

* Time limit
* Autosaved answers
* Automatic grading
* Final score and detailed results

## Accounts

Users can create an account to save:

* Practice attempts
* Mock exam results
* Answer history
* Progress by historical period/topic

## Tech Stack

* **SvelteKit**
* **TypeScript**
* **Tailwind CSS**
* **PostgreSQL / Supabase**
* **Supabase Auth**
* **Drizzle ORM**
* **Zod**
* **Gemini API** (free tier by default) for semantic answer grading
* **Vitest / Playwright**

## Project Structure
src/
├── lib/
│   ├── components/
│   │   ├── task/
│   │   ├── questions/
│   │   └── admin/
│   │
│   ├── server/
│   │   ├── db/
│   │   ├── grading/
│   │   ├── tasks/
│   │   └── exams/
│   │
│   └── types/
│
├── routes/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── aufgaben/
│   │   ├── uben/
│   │   ├── prufung/
│   │   └── profil/
│   │
│   └── admin/
│       ├── aufgaben/
│       ├── prufungen/
│       ├── epochen/
│       ├── themen/
│       └── assets/
│
└── hooks.server.ts

## Content Workflow

Exam content is created and maintained through the admin CMS.

Typical workflow:

Create exam
   ↓
Create tasks
   ↓
Add sources and subquestions
   ↓
Configure grading
   ↓
Validate
   ↓
Preview
   ↓
Publish

Tasks can have one of three states:

draft
published
archived

Only published tasks are visible in Aufgaben, Üben, and Prüfung.

## Status

Currently in development. Milestones 1 through 9 are implemented: authentication and authorization,
the versioned task-content workflow, the learner task browser, and a complete admin CMS with
structured question/source editors, private asset management, validation, previews, revisions,
publishing, archiving, and restoration. Milestone 3.1 adds a learner-safe content boundary,
shared read-only task rendering, and an authenticated browser-test scaffold. The deterministic
grader and practice workflow add validated autosave, resumable attempts, transactional idempotent
submission, per-question results, and auditable grading runs. Mock exam mode adds a configurable
official 12-task/50-point composition, a server-authoritative 100-minute deadline, persisted task
order, autosave, navigation, and detailed review. Database locks and partial uniqueness make start,
save, submission, and timeout finalization safe across refreshes and tabs.

Every practice attempt is retained. The result page computes and displays the learner's best score
for the immutable task version; older attempts are not overwritten or re-labelled.

The initial V1 aims to include:

Authentication
Historical exam database
Aufgaben browser
Practice mode
Mock exam mode
Automatic grading
AI-assisted grading
Progress statistics
Admin CMS
Draft and publishing workflow
Asset management

## Development Setup

### Prerequisites

* Node.js 24 (see `.nvmrc`)
* npm
* A hosted Supabase project

Install the locked dependencies:

```sh
npm ci
```

Copy `.env.example` to `.env` and provide:

* The project URL and publishable key from the Supabase Connect dialog
* A server-only Supabase secret key for private asset uploads and signed previews
* A transaction-pooler `DATABASE_URL` for the restricted `abipro_app` role
* An owner `DATABASE_MIGRATION_URL` used only for migrations

In Supabase Auth URL Configuration, add the local and deployed
`/auth/callback` URLs to the redirect allow list. Email confirmation may be
enabled or disabled; the registration flow supports both modes.

### Database migrations

The TypeScript Drizzle schema and committed SQL migrations are the database
source of truth. Generate and review migrations before applying them:

```sh
npm run db:generate -- --name=describe_the_change
npm run db:migrate
```

Do not use `drizzle-kit push` against the hosted project.

The initial migration creates `abipro_app` without login access. After applying
it, assign a generated password once through the Supabase SQL Editor without
committing the password:

```sql
alter role abipro_app login password '<generated-password>';
```

Use that password only in the runtime `DATABASE_URL`. The owner connection must
not be used by the running application.

To promote the first administrator, update the matching profile from the SQL
Editor:

```sql
update app_private.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

### Run the app

```sh
npm run dev
```

The interface intentionally uses only a light, basic presentation layer so it can be restyled later.
Run `npm test`, `npm run check`, and `npm run build` before committing changes.

AI grading needs the server-only `GEMINI_API_KEY` from Google AI Studio. Exact accepted answers never call Gemini. Normal tests use fixture transports and never make live model calls. See `docs/operations.md` for release, backup, rollback, security, load-test, and usability procedures.

## Importing official exams

Official exams are imported one session at a time. The importer deliberately does not attempt to parse PDFs with heuristics: it renders every page, asks Gemini to map and convert one task at a time using the official solution pages as evidence, and only publishes a locally validated draft.

```bash
npm run exams:prepare -- 2006_tavasz
npm run exams:generate -- 2006_tavasz
npm run exams:validate -- 2006_tavasz
npm run exams:publish -- 2006_tavasz
```

Jobs live in `tmp/exam-imports/<exam>/`. `prepare` is safe to repeat; `generate` requires `GEMINI_API_KEY` and optionally uses `GEMINI_IMPORT_MODEL` (otherwise `GEMINI_MODEL`). Review `review/report.json` before publishing. Publishing refuses invalid, stale, or previously imported tasks and never deletes unrelated content.

## Újkor.hu collection and official history taxonomy

The Újkor.hu DOCX task books and answer keys belong in `ujkor.hu-feladatok/`. Run `npm run ujkor:extract` with Python packages `python-docx` and `Pillow` installed; EMF illustrations also require LibreOffice. Extraction writes `data/ujkor-tasks.json` and web images under `static/ujkor/`. Gemini then converts each task with its matching answer key into answerable questions:

```bash
npm run ujkor:generate
npm run ujkor:validate
npm run ujkor:publish
```

Review `data/ujkor-generated/report.json` before publishing. The importer is resumable by slug and puts uncertain conversions into drafts. Újkor.hu tasks have their own collection origin and Hungarian/global history scope; they have no official curriculum or exam session and are excluded from simulated official exams.

The seven eras and 43 topics in `src/lib/history-taxonomy.ts` come from the 2024 official history exam specification. To classify an existing database before importing Újkor.hu tasks, run `npm run history:classify`, inspect the generated `data/history-tags/` batches, then run `npm run history:apply`. The latter replaces old era and topic labels on all task versions. Admins can view these reference lists but cannot add arbitrary labels.

The authenticated Playwright smoke test uses a dedicated learner account. Install Chromium once,
set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`, then run:

```sh
npx playwright install chromium
npm run test:e2e
```

Set `E2E_BASE_URL` to test an already running deployment instead of starting the local preview server.

To create three draft templates that exercise all supported question types, run:

```sh
npm run db:seed
```

The templates deliberately contain placeholder content and remain drafts. An administrator must
replace that content with verified exam material before publishing it through the CMS.

To idempotently import the 12 short-answer exercises from the German-language May 2026 history
exam as draft test data, run:

```sh
npm run db:seed:exam
```

The import uses the official marking guide for answer rules. It deliberately excludes every essay
exercise and keeps the imported records in draft status for editorial review.
