import { safeFetch } from '@/lib/http/fetcher';
import { logger } from '@/lib/observability/logger';
import type { ArticleId } from '@/shared/type-utils';
import type { ArticleContentFetcher, FetchedContent } from '../domain/article-content-fetcher';

/** 本文として短すぎる(抽出失敗とみなす)下限文字数。下回ったら null で抜粋フォールバックさせる。 */
const MIN_USABLE_CHARS = 200;

/**
 * HTML から本文プレーンテキストを抽出する素朴な実装。
 * script/style/noscript を除去し、タグを落として空白を畳む。
 *
 * NOTE: Readability 系(本文抽出)・robots.txt 尊重は ADR-0026 の課題。現状は企業RSS(運営管理)の
 * 既知ドメインのみを対象とする前提の最小実装。ユーザー登録RSS等へ広げる際に強化する(GitHub Issue 管理)。
 */
function extractText(html: string): string {
  const body = html.replace(/[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
  return body
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ArticleContentFetcher の実装(Driven Adapter)。
 * 取得した本文は要約生成に使ったあと破棄する(全文を保存しない / ADR-0026)。
 */
export class HtmlContentFetcher implements ArticleContentFetcher {
  async fetch(input: { articleId: ArticleId; url: string }): Promise<FetchedContent | null> {
    const res = await safeFetch(input.url, { timeoutMs: 10_000, retries: 1 });
    if (!res.ok) {
      logger.warn('article content fetch failed', { articleId: input.articleId, error: res.error });
      return null;
    }
    const html = await res.value.text();
    const text = extractText(html);
    if (text.length < MIN_USABLE_CHARS) return null;
    return { text, source: 'full_text' };
  }
}
