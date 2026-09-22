ALTER TABLE "articles" ADD COLUMN "hatena_bookmark_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "metrics_fetched_at" timestamp with time zone;