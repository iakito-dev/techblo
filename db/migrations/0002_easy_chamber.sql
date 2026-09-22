CREATE TABLE "article_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"hatena_count" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "trend_score" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "article_metric_snapshots" ADD CONSTRAINT "article_metric_snapshots_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_metric_snapshots_article_captured_idx" ON "article_metric_snapshots" USING btree ("article_id","captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_trend_idx" ON "articles" USING btree ("trend_score" DESC NULLS LAST,"published_at" DESC NULLS LAST);