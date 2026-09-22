import type { ArticleId, UserId } from '@/shared/type-utils';

/**
 * Driven Port。既読マークの永続化インターフェース。実装は infrastructure 層。
 *
 * 既読は「記事ページを開いた」タイミングで付くだけで外す操作は無い(手動トグル無し)。
 * 全記事に及びうるため一覧で全件返さない(フィードの未読/既読フィルタは feed 側の SQL で絞る。ADR-0021)。
 */
export interface ReadRepository {
  /** 1記事を既読にする。冪等(既に既読なら何もしない)。 */
  markRead(userId: UserId, articleId: ArticleId): Promise<void>;
  /** 複数記事をまとめて既読にする(ログイン時のゲストデータ移行用)。冪等。 */
  addMany(userId: UserId, articleIds: ArticleId[]): Promise<void>;
}
