import { parsePublicHttpUrl } from '@/lib/http/safe-url';
import { err, ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { type AddUserFeedError, MAX_FEEDS_PER_USER } from './errors';
import type { FeedFetcher } from './feed-fetcher';

const TITLE_MAX_LENGTH = 200;

const normalizeTitle = (raw: string | null): string | null => {
  const t = raw?.trim();
  return t ? t.slice(0, TITLE_MAX_LENGTH) : null;
};

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * マイフィードを1件登録する。
 * 上限・重複を確認 → RSS を即時取得(SSRF 検証込み)→ フィード行と記事を保存する。
 * 取得失敗時はフィードを作らない(空のフィードを残さない)。
 */
export const addUserFeed =
  (deps: { feeds: UserFeedRepository; fetchFeed: FeedFetcher }) =>
  async (input: {
    userId: UserId;
    rssUrl: string;
  }): Promise<Result<{ id: string; added: number }, AddUserFeedError>> => {
    const rssUrl = input.rssUrl.trim();
    const parsed = parsePublicHttpUrl(rssUrl);
    if (!parsed.ok) return err({ kind: 'VALIDATION', message: parsed.error });

    const count = await deps.feeds.countByUser(input.userId);
    if (count >= MAX_FEEDS_PER_USER) {
      return err({ kind: 'LIMIT_EXCEEDED', limit: MAX_FEEDS_PER_USER });
    }
    if (await deps.feeds.existsByUrl(input.userId, rssUrl)) {
      return err({ kind: 'DUPLICATE' });
    }

    const fetched = await deps.fetchFeed(rssUrl);
    if (!fetched.ok) return err({ kind: 'FETCH_FAILED', message: fetched.error });

    const title = normalizeTitle(fetched.value.title) ?? hostnameOf(rssUrl);
    const { id } = await deps.feeds.add(input.userId, {
      rssUrl,
      title,
      siteUrl: fetched.value.siteUrl,
    });
    const added = await deps.feeds.upsertArticles(id, fetched.value.articles);
    await deps.feeds.recordSuccess(id);

    return ok({ id, added });
  };
