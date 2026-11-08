CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"tour_slug" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"people" integer,
	"experience" text,
	"message" text,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"memo" text,
	CONSTRAINT "inquiries_kind_check" CHECK ("inquiries"."kind" in ('reservation', 'notice')),
	CONSTRAINT "inquiries_status_check" CHECK ("inquiries"."status" in ('new', 'in_progress', 'done')),
	CONSTRAINT "inquiries_people_check" CHECK ("inquiries"."people" is null or ("inquiries"."people" >= 1 and "inquiries"."people" <= 10))
);
--> statement-breakpoint
CREATE INDEX "inquiries_tour_kind_idx" ON "inquiries" USING btree ("tour_slug","kind");--> statement-breakpoint
CREATE INDEX "inquiries_received_idx" ON "inquiries" USING btree ("received_at");