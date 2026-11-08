CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_status_check";--> statement-breakpoint
-- 이전 상태값(in_progress, done)을 새 값으로 옮긴다: 예약 문의는 확인/확정, 소식 받기는 안내 완료
UPDATE "inquiries" SET "status" = 'checked' WHERE "kind" = 'reservation' AND "status" = 'in_progress';--> statement-breakpoint
UPDATE "inquiries" SET "status" = 'confirmed' WHERE "kind" = 'reservation' AND "status" = 'done';--> statement-breakpoint
UPDATE "inquiries" SET "status" = 'notified' WHERE "kind" = 'notice' AND "status" IN ('in_progress', 'done');--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_status_check" CHECK (("inquiries"."kind" = 'reservation' and "inquiries"."status" in ('new', 'checked', 'confirmed', 'cancelled')) or ("inquiries"."kind" = 'notice' and "inquiries"."status" in ('new', 'notified')));