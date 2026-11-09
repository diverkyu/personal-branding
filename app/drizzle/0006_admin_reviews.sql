CREATE TABLE "review_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"reason" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_revisions_reason_check" CHECK ("review_revisions"."reason" in ('create', 'edit', 'status', 'withdraw', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"author_label" text NOT NULL,
	"label_kind" text NOT NULL,
	"written_on" date NOT NULL,
	"source_kind" text DEFAULT '' NOT NULL,
	"source_note" text DEFAULT '' NOT NULL,
	"tour_slug" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_order" integer DEFAULT 100 NOT NULL,
	"consent_confirmed" boolean DEFAULT false NOT NULL,
	"consent_note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'private' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reviews_body_check" CHECK (char_length("reviews"."body") between 1 and 1000),
	CONSTRAINT "reviews_author_check" CHECK (char_length("reviews"."author_label") between 1 and 40),
	CONSTRAINT "reviews_label_kind_check" CHECK ("reviews"."label_kind" in ('real', 'initial', 'nick')),
	CONSTRAINT "reviews_source_kind_check" CHECK ("reviews"."source_kind" in ('', 'bluepebble', 'instagram', 'direct', 'other')),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" in ('private', 'public')),
	CONSTRAINT "reviews_consent_check" CHECK ("reviews"."status" <> 'public' or "reviews"."consent_confirmed"),
	CONSTRAINT "reviews_featured_order_check" CHECK ("reviews"."featured_order" between 0 and 9999)
);
--> statement-breakpoint
ALTER TABLE "review_revisions" ADD CONSTRAINT "review_revisions_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_revisions_review_idx" ON "review_revisions" USING btree ("review_id","version");--> statement-breakpoint
CREATE INDEX "reviews_status_written_idx" ON "reviews" USING btree ("status","written_on");--> statement-breakpoint
CREATE INDEX "reviews_tour_idx" ON "reviews" USING btree ("tour_slug");