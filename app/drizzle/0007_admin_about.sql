CREATE TABLE "about" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"body" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"photo_media_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"draft" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "about_status_check" CHECK ("about"."status" in ('draft', 'published')),
	CONSTRAINT "about_single_check" CHECK ("about"."id" = 'main')
);
--> statement-breakpoint
ALTER TABLE "about" ADD CONSTRAINT "about_photo_media_id_media_id_fk" FOREIGN KEY ("photo_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;