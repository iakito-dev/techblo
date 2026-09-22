import type { UserFeedId, UserId } from '@/shared/type-utils';
import type { NewUserFeed, UserFeed, UserFeedArticleDraft } from './user-feed';

/** フィード登録の結果。新規作成された行を返す。重複は呼び出し前にチェック済み。 */
export type AddUserFeedResult = { id: UserFeedId };

/**
 * ユーザー登録 RSS の永続化境界(Driven Port)。実装は infrastructure の Drizzle Repository。
 * userId を常に引数で受け、所有者以外の行に触れないよう各操作で WHERE に含める。
 */
export interface UserFeedRepository {
  listByUser(userId: UserId): Promise<UserFeed[]>;
  /** 有効(enabled)なフィードの id のみ。メインフィードのマージ対象解決に使う。 */
  listEnabledIds(userId: UserId): Promise<UserFeedId[]>;
  /** フィルタ UI 用: 有効フィードを記事件数付きで返す。 */
  listFiltersByUser(
    userId: UserId,
  ): Promise<{ id: UserFeedId; title: string; siteUrl: string | null; articleCount: number }[]>;
  /** 全ユーザーの有効フィード(定期取得バッチ用、所有者非依存)。 */
  listAllEnabled(): Promise<{ id: UserFeedId; rssUrl: string }[]>;
  countByUser(userId: UserId): Promise<number>;
  /** 同一ユーザーが同じ URL を既に登録済みか。 */
  existsByUrl(userId: UserId, rssUrl: string): Promise<boolean>;
  add(userId: UserId, feed: NewUserFeed): Promise<AddUserFeedResult>;
  setEnabled(userId: UserId, id: UserFeedId, enabled: boolean): Promise<void>;
  remove(userId: UserId, id: UserFeedId): Promise<void>;
  /** 取得処理のために所有者検証付きで1件引く(無ければ null)。 */
  findById(userId: UserId, id: UserFeedId): Promise<UserFeed | null>;

  /** 取り込んだ記事を upsert し、新規追加件数を返す(フィード内 url で冪等)。 */
  upsertArticles(id: UserFeedId, drafts: UserFeedArticleDraft[]): Promise<number>;
  recordSuccess(id: UserFeedId): Promise<void>;
  recordFailure(id: UserFeedId, message: string): Promise<void>;
}
