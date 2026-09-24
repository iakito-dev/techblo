import { assertPublicHttpUrl } from '@/lib/http/safe-url';
import { fetchFeed } from '@/lib/rss/fetcher';
import { parseFeed, parseFeedMeta } from '@/lib/rss/parser';
import { err, ok } from '@/shared/result';
import type { FeedFetcher } from '../application/feed-fetcher';

/**
 * FeedFetcher の実装(Driven Adapter)。
 * SSRF 検証(リダイレクト先含む)→ XML 取得 → 記事パース + メタ抽出を1経路にまとめる。
 * ユーザー向け文言にして返す(actions 層がそのままトーストに出せる粒度)。
 */
export const rssFeedFetcher: FeedFetcher = async (rssUrl) => {
  // 形式・ホストの誤りは取得前に入力エラーとして返す(リダイレクト先は fetchFeed 内で再検証)。
  const safe = await assertPublicHttpUrl(rssUrl);
  if (!safe.ok) return err(safe.error);

  const fetched = await fetchFeed(safe.value, { guardUrl: assertPublicHttpUrl });
  if (!fetched.ok) return err(`フィードを取得できませんでした(${fetched.error})`);

  const parsed = parseFeed(fetched.value);
  if (!parsed.ok) return err('RSS / Atom として解析できませんでした');
  if (parsed.value.length === 0) return err('記事が1件も見つかりませんでした');

  const meta = parseFeedMeta(fetched.value);
  return ok({ title: meta.title, siteUrl: meta.siteUrl, articles: parsed.value });
};
