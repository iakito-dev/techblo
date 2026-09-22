-- 記事検索(?q=)用。ILIKE 部分一致を pg_trgm の GIN でインデックスサポートする(ADR-0022)。
-- tsvector(FTS)は日本語をトークナイズできないため不採用。trgm は UTF-8 マルチバイトにも効く。
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_title_trgm_idx" ON "articles" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_description_trgm_idx" ON "articles" USING gin ("description" gin_trgm_ops);
