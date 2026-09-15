# V1 operations and release runbook

## Release gate

Use Node 24 and a production-like Supabase branch. Run `npm ci`, `npm test`, `npm run check`, `npm run build`, `npm run db:migrate`, and `npm run test:e2e`. Verify the migration on an empty database and on a recent anonymized schema copy. Do not release when any command fails.

## Secrets and access

`DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SUPABASE_SECRET_KEY`, and `GEMINI_API_KEY` are server-only deployment secrets. Only `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` may reach the browser. The runtime uses the restricted `abipro_app` role; the migration owner is never used by the application. Review browser bundles and deployment logs for secret names before release.

The `app_private` schema is not exposed to `anon` or `authenticated`. Ownership checks are performed in every server query, and admin mutations call `assertAdmin`. The private asset bucket is accessed through short-lived signed URLs. Secret-key Storage operations stay server-side.

## Backup and restore

Enable Supabase daily backups and point-in-time recovery where the plan supports it. Before a migration, record the latest restorable timestamp and take a logical schema backup with `pg_dump --schema=app_private --schema-only`. For a restore drill, restore into a separate project, run the reconciliation queries, and verify representative profile, attempt, answer, and grading-run counts before changing traffic.

Never edit an already-applied migration. Roll forward with a corrective migration. If a destructive migration must be rolled back, stop writes, restore the pre-migration backup into a new database, verify counts and ownership, rotate database credentials, then switch traffic. Document the recovery point and any lost write interval.

## Migrations and seeds

Generate migrations with `npm run db:generate -- --name=<description>` and review SQL, grants, constraints, indexes, and data backfills. Apply with the owner-only `DATABASE_MIGRATION_URL`. The runtime seed commands are idempotent and create draft content; publishing remains an admin action. On a clean database: migrate, set the `abipro_app` login password out of band, run the seeds, and execute the release gate.

## Monitoring and privacy

Server errors are structured JSON containing request ID, route, user ID, error class, and a bounded message. Learner answers are deliberately excluded. Send stderr to the production error monitor and alert on elevated 5xx, Gemini `needs_review`, submission conflicts, and rate-limit events. Set retention limits for application logs and grading audit rows.

## Load and usability checks

Run `npm run test:load` against a staging base URL with at least 25 concurrent virtual learners after seeding representative tasks. Monitor p95 latency and database saturation for task browsing, attempt creation, autosave, submission, profile aggregates, and AI queue processing. Record the tested commit, dataset size, concurrency, p95, error rate, and bottlenecks.

Conduct a moderated test with at least five learners on phone and desktop. Include keyboard-only choice, matching, ordering, autosave recovery, timer warnings, submission, AI disclosure, self-grading, history reconciliation, export, and deletion. Capture completion rate and blocking issues without copying learner answers into tickets.

## Security review checklist

- Confirm `anon`, `authenticated`, and `public` have no privileges on `app_private`.
- Confirm `abipro_app` has only the grants in migrations and cannot create roles or databases.
- Confirm all answer and attempt queries include the authenticated owner.
- Confirm admin routes use the database-backed profile role, never user-editable metadata.
- Confirm Storage is private and all mutations use the Storage API.
- Confirm no server secret appears in generated client assets, source maps, logs, or error responses.
- Confirm account deletion removes the Auth user and cascading profile/attempt data; perform a restore drill separately.
