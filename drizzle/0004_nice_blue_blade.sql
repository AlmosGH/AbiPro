ALTER TYPE "app_private"."grading_method" ADD VALUE 'self';--> statement-breakpoint
CREATE TABLE "app_private"."rate_limit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."rate_limit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_private"."grading_runs" ADD COLUMN "input_hash" text;--> statement-breakpoint
UPDATE "app_private"."grading_runs"
SET "input_hash" = coalesce("result" ->> 'inputHash', md5("id"::text || ':' || "created_at"::text));--> statement-breakpoint
ALTER TABLE "app_private"."grading_runs" ALTER COLUMN "input_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."grading_runs" ADD COLUMN "attempt_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."rate_limit_events" ADD CONSTRAINT "rate_limit_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_private"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limit_events_user_action_created_idx" ON "app_private"."rate_limit_events" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "grading_runs_idempotency_idx" ON "app_private"."grading_runs" USING btree ("attempt_answer_id","method","grader_schema_version","input_hash");--> statement-breakpoint
ALTER TABLE "app_private"."grading_runs" ADD CONSTRAINT "grading_runs_attempt_count_check" CHECK ("app_private"."grading_runs"."attempt_count" between 1 and 3);
--> statement-breakpoint
REVOKE ALL ON TABLE "app_private"."rate_limit_events" FROM public, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE "app_private"."rate_limit_events" TO abipro_app;
GRANT USAGE, SELECT ON SEQUENCE "app_private"."rate_limit_events_id_seq" TO abipro_app;
