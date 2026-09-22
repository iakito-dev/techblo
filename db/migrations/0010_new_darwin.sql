ALTER TABLE "article_summaries" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "article_summaries" ADD COLUMN "categorized_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "article_summaries_category_ready_idx" ON "article_summaries" USING btree ("category") WHERE "article_summaries"."status" = 'ready';