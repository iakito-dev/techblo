import type { ArticleId } from '@/shared/type-utils';

/**
 * Driven Port。記事 URL から本文テキストを一時取得する(ADR-0026)。
 * 全文は保存しない — usecase が要約生成に使ったあと破棄する。
 * 実装は infrastructure 層。取得不可(robots 不許可・404・JS依存等)は null を返し、
 * usecase が RSS 抜粋へフォールバックする。
 */
export type FetchedContent = {
  text: string;
  source: 'full_text';
};

export interface ArticleContentFetcher {
  fetch(input: { articleId: ArticleId; url: string }): Promise<FetchedContent | null>;
}
