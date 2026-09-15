ALTER TABLE "app_private"."task_versions" ADD COLUMN "exam_position" integer;--> statement-breakpoint
UPDATE "app_private"."task_versions" AS "version"
SET "exam_position" = "mapping"."position"
FROM "app_private"."tasks" AS "task",
	(VALUES
		('test-2026-mai-01-juedische-religion', 1),
		('test-2026-mai-02-grundherrschaft', 2),
		('test-2026-mai-03-hunyadis', 3),
		('test-2026-mai-04-usa', 4),
		('test-2026-mai-05-rakoczi', 5),
		('test-2026-mai-06-sozialismus', 6),
		('test-2026-mai-07-wirtschaftlicher-ausgleich', 7),
		('test-2026-mai-08-sowjetunion', 8),
		('test-2026-mai-09-kulturpolitik', 9),
		('test-2026-mai-10-deutschland-nach-1945', 10),
		('test-2026-mai-11-wende', 11),
		('test-2026-mai-12-auslandsungarn', 12)
	) AS "mapping"("slug", "position")
WHERE "version"."task_id" = "task"."id" AND "task"."slug" = "mapping"."slug";--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_user_active_mock_exam_idx" ON "app_private"."assessment_attempts" USING btree ("user_id") WHERE "app_private"."assessment_attempts"."kind" = 'mock_exam' and "app_private"."assessment_attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "task_versions_exam_position_idx" ON "app_private"."task_versions" USING btree ("exam_position") WHERE "app_private"."task_versions"."exam_position" is not null;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_exam_position_check" CHECK ("app_private"."task_versions"."exam_position" is null or "app_private"."task_versions"."exam_position" between 1 and 12);
