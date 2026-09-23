DO $$ BEGIN CREATE TYPE "app_private"."history_scope" AS ENUM('hungarian', 'global'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "app_private"."task_origin" AS ENUM('official', 'ujkor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ALTER COLUMN "curriculum_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ALTER COLUMN "exam_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."task_versions" ADD COLUMN IF NOT EXISTS "history_scope" "app_private"."history_scope" DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_private"."tasks" ADD COLUMN IF NOT EXISTS "origin" "app_private"."task_origin" DEFAULT 'official' NOT NULL;
