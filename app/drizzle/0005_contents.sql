CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"cover_media_id" uuid,
	"body" jsonb NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"answers" text[] DEFAULT '{}'::text[] NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"origin" text DEFAULT 'manual' NOT NULL,
	"origin_note" text DEFAULT '' NOT NULL,
	"draft" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "contents_status_check" CHECK ("contents"."status" in ('draft', 'review', 'scheduled', 'published', 'archived')),
	CONSTRAINT "contents_origin_check" CHECK ("contents"."origin" in ('manual', 'ai_assisted', 'automated')),
	CONSTRAINT "contents_scheduled_check" CHECK ("contents"."status" <> 'scheduled' or "contents"."publish_at" is not null),
	CONSTRAINT "contents_published_check" CHECK ("contents"."status" <> 'published' or "contents"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "publish_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "publish_jobs_state_check" CHECK ("publish_jobs"."state" in ('pending', 'running', 'done', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contents_type_slug_uq" ON "contents" USING btree ("type","slug") WHERE "contents"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "contents_status_updated_idx" ON "contents" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "contents_type_idx" ON "contents" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "publish_jobs_active_uq" ON "publish_jobs" USING btree ("content_id") WHERE "publish_jobs"."state" in ('pending', 'running');--> statement-breakpoint
CREATE INDEX "publish_jobs_due_idx" ON "publish_jobs" USING btree ("state","run_at");