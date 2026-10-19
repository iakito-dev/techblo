import type { ArticleId, UserId } from '@/shared/type-utils';

/** 閲覧履歴の1件。readAt は最後にその記事ページを開いた時刻。 */
export type ReadEntry = {
  articleId: ArticleId;
  readAt: Date;
};

/**
 * Driven Port。既読マークの永続化インターフェース。実装は infrastructure 層。
 *
 * 既読は「記事ページを開いた」タイミングで付くだけで外す操作は無い(手動トグル無し)。
 * 全記事に及びうるため一覧で全件返さない(フィードの未読/既読フィルタは feed 側の SQL で絞る。ADR-0021)。
 * 閲覧履歴は件数上限付きの直近分だけを返す(ADR-0041)。
 */
export interface ReadRepository {
  /** 1記事を既読にする。既に既読なら readAt を今に更新する(閲覧履歴の並びを最新の閲覧に揃える)。 */
  markRead(userId: UserId, articleId: ArticleId): Promise<void>;
  /** 複数記事をまとめて既読にする(ログイン時のゲストデータ移行用)。冪等。 */
  addMany(userId: UserId, articleIds: ArticleId[]): Promise<void>;
  /** 直近に読んだ記事を readAt の降順で最大 limit 件返す。 */
  listRecent(userId: UserId, limit: number): Promise<ReadEntry[]>;
}
