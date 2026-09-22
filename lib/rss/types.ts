import { z } from 'zod';

export const ARTICLE_DESCRIPTION_MAX_LENGTH = 10_000;

/**
 * RSS/Atom から正規化した記事1件。
 * articles テーブルへの upsert 前の中間表現。
 */
export const articleInputSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500),
  // 抜粋。HTMLを含む可能性があるため表示前に sanitize する
  description: z.string().max(ARTICLE_DESCRIPTION_MAX_LENGTH).nullable(),
  ogImage: z.string().url().nullable(),
  author: z.string().max(200).nullable(),
  publishedAt: z.date(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export type ParseError = {
  kind: 'INVALID_XML' | 'UNKNOWN_FORMAT' | 'NO_ITEMS';
  message: string;
};
