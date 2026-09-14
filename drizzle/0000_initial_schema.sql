CREATE SCHEMA "app_private";
--> statement-breakpoint
CREATE TYPE "app_private"."app_role" AS ENUM('learner', 'admin');--> statement-breakpoint
CREATE TYPE "app_private"."assessment_kind" AS ENUM('practice', 'mock_exam');--> statement-breakpoint
CREATE TYPE "app_private"."assessment_status" AS ENUM('in_progress', 'submitted', 'graded', 'abandoned');--> statement-breakpoint
CREATE TYPE "app_private"."exam_session_kind" AS ENUM('spring', 'autumn');--> statement-breakpoint
CREATE TYPE "app_private"."grading_method" AS ENUM('deterministic', 'ai');--> statement-breakpoint
CREATE TYPE "app_private"."grading_status" AS ENUM('pending', 'processing', 'graded', 'needs_review', 'failed');--> statement-breakpoint
CREATE TYPE "app_private"."question_kind" AS ENUM('choice', 'multiple_choice', 'matching', 'ordering', 'short_text');--> statement-breakpoint
CREATE TYPE "app_private"."source_kind" AS ENUM('text', 'image', 'table', 'map');--> statement-breakpoint
CREATE TYPE "app_private"."task_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "app_private"."task_version_status" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TABLE "app_private"."assessment_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."assessment_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"kind" "app_private"."assessment_kind" NOT NULL,
	"status" "app_private"."assessment_status" DEFAULT 'in_progress' NOT NULL,
	"time_limit_seconds" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"score" numeric(7, 2),
	"max_score" numeric(7, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attempts_time_limit_check" CHECK ("app_private"."assessment_attempts"."time_limit_seconds" is null or "app_private"."assessment_attempts"."time_limit_seconds" > 0),
	CONSTRAINT "assessment_attempts_max_score_check" CHECK ("app_private"."assessment_attempts"."max_score" > 0),
	CONSTRAINT "assessment_attempts_score_check" CHECK ("app_private"."assessment_attempts"."score" is null or ("app_private"."assessment_attempts"."score" >= 0 and "app_private"."assessment_attempts"."score" <= "app_private"."assessment_attempts"."max_score")),
	CONSTRAINT "assessment_attempts_expiry_check" CHECK ("app_private"."assessment_attempts"."expires_at" is null or "app_private"."assessment_attempts"."expires_at" > "app_private"."assessment_attempts"."started_at")
);
--> statement-breakpoint
CREATE TABLE "app_private"."assets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bucket" text DEFAULT 'exam-assets' NOT NULL,
	"path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"alt_text" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_bucket_path_unique" UNIQUE("bucket","path"),
	CONSTRAINT "assets_size_bytes_check" CHECK ("app_private"."assets"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."attempt_answers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."attempt_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"attempt_task_id" bigint NOT NULL,
	"question_id" bigint NOT NULL,
	"response" jsonb NOT NULL,
	"status" "app_private"."grading_status" DEFAULT 'pending' NOT NULL,
	"awarded_points" numeric(6, 2),
	"feedback" text,
	"last_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_answers_attempt_task_question_unique" UNIQUE("attempt_task_id","question_id"),
	CONSTRAINT "attempt_answers_awarded_points_check" CHECK ("app_private"."attempt_answers"."awarded_points" is null or "app_private"."attempt_answers"."awarded_points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."attempt_tasks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."attempt_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"attempt_id" bigint NOT NULL,
	"task_version_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"max_points" numeric(6, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_tasks_attempt_position_unique" UNIQUE("attempt_id","position"),
	CONSTRAINT "attempt_tasks_attempt_version_unique" UNIQUE("attempt_id","task_version_id"),
	CONSTRAINT "attempt_tasks_position_check" CHECK ("app_private"."attempt_tasks"."position" >= 0),
	CONSTRAINT "attempt_tasks_max_points_check" CHECK ("app_private"."attempt_tasks"."max_points" > 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."curricula" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."curricula_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curricula_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "app_private"."exam_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."exam_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"year" integer NOT NULL,
	"session" "app_private"."exam_session_kind" NOT NULL,
	"official_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_sessions_year_session_unique" UNIQUE("year","session"),
	CONSTRAINT "exam_sessions_year_check" CHECK ("app_private"."exam_sessions"."year" between 2000 and 2100)
);
--> statement-breakpoint
CREATE TABLE "app_private"."grading_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."grading_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"attempt_answer_id" bigint NOT NULL,
	"method" "app_private"."grading_method" NOT NULL,
	"status" "app_private"."grading_status" DEFAULT 'pending' NOT NULL,
	"provider" text,
	"model" text,
	"grader_schema_version" integer DEFAULT 1 NOT NULL,
	"result" jsonb,
	"awarded_points" numeric(6, 2),
	"feedback" text,
	"duration_ms" integer,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "grading_runs_schema_version_check" CHECK ("app_private"."grading_runs"."grader_schema_version" > 0),
	CONSTRAINT "grading_runs_awarded_points_check" CHECK ("app_private"."grading_runs"."awarded_points" is null or "app_private"."grading_runs"."awarded_points" >= 0),
	CONSTRAINT "grading_runs_duration_check" CHECK ("app_private"."grading_runs"."duration_ms" is null or "app_private"."grading_runs"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."historical_periods" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."historical_periods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_periods_slug_unique" UNIQUE("slug"),
	CONSTRAINT "historical_periods_position_check" CHECK ("app_private"."historical_periods"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"role" "app_private"."app_role" DEFAULT 'learner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_private"."questions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"task_version_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"kind" "app_private"."question_kind" NOT NULL,
	"prompt" text NOT NULL,
	"config" jsonb NOT NULL,
	"grading_rule" jsonb NOT NULL,
	"max_points" numeric(6, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_task_version_position_unique" UNIQUE("task_version_id","position"),
	CONSTRAINT "questions_position_check" CHECK ("app_private"."questions"."position" >= 0),
	CONSTRAINT "questions_max_points_check" CHECK ("app_private"."questions"."max_points" > 0)
);
--> statement-breakpoint
CREATE TABLE "app_private"."sources" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"task_version_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"kind" "app_private"."source_kind" NOT NULL,
	"title" text,
	"content" jsonb,
	"asset_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_task_version_position_unique" UNIQUE("task_version_id","position"),
	CONSTRAINT "sources_position_check" CHECK ("app_private"."sources"."position" >= 0),
	CONSTRAINT "sources_content_check" CHECK ("app_private"."sources"."content" is not null or "app_private"."sources"."asset_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app_private"."task_version_topics" (
	"task_version_id" bigint NOT NULL,
	"topic_id" bigint NOT NULL,
	CONSTRAINT "task_version_topics_task_version_id_topic_id_pk" PRIMARY KEY("task_version_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "app_private"."task_versions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."task_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"task_id" bigint NOT NULL,
	"version" integer NOT NULL,
	"status" "app_private"."task_version_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"curriculum_id" bigint NOT NULL,
	"period_id" bigint NOT NULL,
	"exam_session_id" bigint NOT NULL,
	"max_points" numeric(6, 2) NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_versions_task_id_version_unique" UNIQUE("task_id","version"),
	CONSTRAINT "task_versions_version_check" CHECK ("app_private"."task_versions"."version" > 0),
	CONSTRAINT "task_versions_max_points_check" CHECK ("app_private"."task_versions"."max_points" > 0),
	CONSTRAINT "task_versions_published_at_check" CHECK (("app_private"."task_versions"."status" = 'published' and "app_private"."task_versions"."published_at" is not null) or "app_private"."task_versions"."status" <> 'published')
);
--> statement-breakpoint
CREATE TABLE "app_private"."tasks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"status" "app_private"."task_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_private"."topics" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_private"."topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"period_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "app_private"."assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_private"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."assets" ADD CONSTRAINT "assets_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "app_private"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_task_id_attempt_tasks_id_fk" FOREIGN KEY ("attempt_task_id") REFERENCES "app_private"."attempt_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "app_private"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_tasks" ADD CONSTRAINT "attempt_tasks_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "app_private"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."attempt_tasks" ADD CONSTRAINT "attempt_tasks_task_version_id_task_versions_id_fk" FOREIGN KEY ("task_version_id") REFERENCES "app_private"."task_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."grading_runs" ADD CONSTRAINT "grading_runs_attempt_answer_id_attempt_answers_id_fk" FOREIGN KEY ("attempt_answer_id") REFERENCES "app_private"."attempt_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."questions" ADD CONSTRAINT "questions_task_version_id_task_versions_id_fk" FOREIGN KEY ("task_version_id") REFERENCES "app_private"."task_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."sources" ADD CONSTRAINT "sources_task_version_id_task_versions_id_fk" FOREIGN KEY ("task_version_id") REFERENCES "app_private"."task_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."sources" ADD CONSTRAINT "sources_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "app_private"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_version_topics" ADD CONSTRAINT "task_version_topics_task_version_id_task_versions_id_fk" FOREIGN KEY ("task_version_id") REFERENCES "app_private"."task_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_version_topics" ADD CONSTRAINT "task_version_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "app_private"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "app_private"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "app_private"."curricula"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_period_id_historical_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app_private"."historical_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_exam_session_id_exam_sessions_id_fk" FOREIGN KEY ("exam_session_id") REFERENCES "app_private"."exam_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD CONSTRAINT "task_versions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "app_private"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."tasks" ADD CONSTRAINT "tasks_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "app_private"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_private"."topics" ADD CONSTRAINT "topics_period_id_historical_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app_private"."historical_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_attempts_user_id_idx" ON "app_private"."assessment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_user_active_idx" ON "app_private"."assessment_attempts" USING btree ("user_id","started_at") WHERE "app_private"."assessment_attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "assets_created_by_idx" ON "app_private"."assets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "attempt_answers_attempt_task_id_idx" ON "app_private"."attempt_answers" USING btree ("attempt_task_id");--> statement-breakpoint
CREATE INDEX "attempt_answers_question_id_idx" ON "app_private"."attempt_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempt_tasks_attempt_id_idx" ON "app_private"."attempt_tasks" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "attempt_tasks_task_version_id_idx" ON "app_private"."attempt_tasks" USING btree ("task_version_id");--> statement-breakpoint
CREATE INDEX "grading_runs_attempt_answer_id_idx" ON "app_private"."grading_runs" USING btree ("attempt_answer_id");--> statement-breakpoint
CREATE INDEX "grading_runs_pending_idx" ON "app_private"."grading_runs" USING btree ("created_at") WHERE "app_private"."grading_runs"."status" in ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "questions_task_version_id_idx" ON "app_private"."questions" USING btree ("task_version_id");--> statement-breakpoint
CREATE INDEX "sources_task_version_id_idx" ON "app_private"."sources" USING btree ("task_version_id");--> statement-breakpoint
CREATE INDEX "sources_asset_id_idx" ON "app_private"."sources" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "task_version_topics_topic_id_idx" ON "app_private"."task_version_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "task_versions_task_id_idx" ON "app_private"."task_versions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_versions_curriculum_id_idx" ON "app_private"."task_versions" USING btree ("curriculum_id");--> statement-breakpoint
CREATE INDEX "task_versions_period_id_idx" ON "app_private"."task_versions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "task_versions_exam_session_id_idx" ON "app_private"."task_versions" USING btree ("exam_session_id");--> statement-breakpoint
CREATE INDEX "task_versions_created_by_idx" ON "app_private"."task_versions" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "task_versions_published_idx" ON "app_private"."task_versions" USING btree ("task_id") WHERE "app_private"."task_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "tasks_created_by_idx" ON "app_private"."tasks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "topics_period_id_idx" ON "app_private"."topics" USING btree ("period_id");