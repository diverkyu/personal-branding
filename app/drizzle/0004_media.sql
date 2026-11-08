CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_mime_check" CHECK ("media"."mime" = 'image/webp'),
	CONSTRAINT "media_storage_check" CHECK ("media"."storage" in ('blob', 'local')),
	CONSTRAINT "media_size_check" CHECK ("media"."bytes" > 0 and "media"."width" > 0 and "media"."height" > 0)
);
--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");