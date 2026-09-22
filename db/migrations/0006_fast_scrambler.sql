CREATE TABLE "user_feed_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_feed_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"og_image" text,
	"author" text,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"rss_url" text NOT NULL,
	"title" text NOT NULL,
	"site_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_feed_articles" ADD CONSTRAINT "user_feed_articles_user_feed_id_user_feeds_id_fk" FOREIGN KEY ("user_feed_id") REFERENCES "public"."user_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_feed_articles_feed_url_uq" ON "user_feed_articles" USING btree ("user_feed_id","url");--> statement-breakpoint
CREATE INDEX "user_feed_articles_feed_published_idx" ON "user_feed_articles" USING btree ("user_feed_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "user_feeds_user_url_uq" ON "user_feeds" USING btree ("user_id","rss_url");--> statement-breakpoint
CREATE INDEX "user_feeds_user_idx" ON "user_feeds" USING btree ("user_id");