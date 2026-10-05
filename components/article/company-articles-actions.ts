'use server';

import { z } from 'zod';
import { COMPANY_PAGE_SIZE } from './company-page-size';
import { type ComposedArticle, getCompanyArticles } from './feed-load-more';

// 公開ページから呼ばれる Server Action なので、入力は信用せず境界で絞る。
// page の上限は無制限なオフセット走査(DB 負荷)を避けるための安全弁。
const inputSchema = z.object({
  slug: z.string().min(1).max(100),
  page: z.number().int().positive().max(500),
});

/**
 * 企業ページの「もっと読む」用 Server Action。認証は要求しない(公開ページ)。
 * ログイン時の保存状態の上乗せは getCompanyArticles が行う。
 * 不正入力は空結果(hasMore=false)で返し、クライアントの自動読み込みを止める。
 */
export async function loadMoreCompanyArticles(
  input: unknown,
): Promise<{ items: ComposedArticle[]; hasMore: boolean }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { items: [], hasMore: false };
  const { items, hasMore } = await getCompanyArticles({
    slug: parsed.data.slug,
    page: parsed.data.page,
    limit: COMPANY_PAGE_SIZE,
  });
  return { items, hasMore };
}
