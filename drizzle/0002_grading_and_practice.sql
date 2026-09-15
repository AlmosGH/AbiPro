ALTER TABLE "app_private"."attempt_answers" DROP CONSTRAINT "attempt_answers_attempt_task_id_attempt_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" DROP CONSTRAINT "attempt_answers_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ADD COLUMN "task_version_id" bigint;--> statement-breakpoint
UPDATE "app_private"."attempt_answers" AS answer
SET "task_version_id" = attempt_task."task_version_id"
FROM "app_private"."attempt_tasks" AS attempt_task
WHERE answer."attempt_task_id" = attempt_task."id";--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ALTER COLUMN "task_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_tasks" ADD CONSTRAINT "attempt_tasks_id_version_unique" UNIQUE("id","task_version_id");--> statement-breakpoint
ALTER TABLE "app_private"."questions" ADD CONSTRAINT "questions_id_task_version_unique" UNIQUE("id","task_version_id");--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_task_version_fk" FOREIGN KEY ("attempt_task_id","task_version_id") REFERENCES "app_private"."attempt_tasks"("id","task_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ADD CONSTRAINT "attempt_answers_question_version_fk" FOREIGN KEY ("question_id","task_version_id") REFERENCES "app_private"."questions"("id","task_version_id") ON DELETE restrict ON UPDATE no action;
