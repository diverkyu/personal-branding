CREATE TABLE "seo_fields" (
	"path" text PRIMARY KEY NOT NULL,
	"field" text NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "seo_fields_field" CHECK ("seo_fields"."field" in ('freediving','ai','brand','unknown'))
);
--> statement-breakpoint
CREATE TABLE "seo_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"engine" text NOT NULL,
	"url" text NOT NULL,
	"observed_on" date NOT NULL,
	"source_url" text,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'needed' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"period_start" date,
	"period_end" date,
	"clicks" jsonb,
	"impressions" jsonb,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "seo_journal_engine" CHECK ("seo_journal"."engine" in ('google','bing','naver')),
	CONSTRAINT "seo_journal_status" CHECK ("seo_journal"."status" in ('needed','fixed','retest','resolved','further'))
);
--> statement-breakpoint
CREATE TABLE "seo_sync" (
	"scope" text PRIMARY KEY NOT NULL,
	"engine" text NOT NULL,
	"snapshot" jsonb,
	"attempted_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"error_code" text,
	"lease" uuid,
	"lease_until" timestamp with time zone,
	CONSTRAINT "seo_sync_engine" CHECK ("seo_sync"."engine" in ('google','bing'))
);
--> statement-breakpoint
CREATE INDEX "seo_journal_updated" ON "seo_journal" USING btree ("updated_at");