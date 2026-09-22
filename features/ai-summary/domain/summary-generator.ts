/**
 * Driven Port。本文(または抜粋)から3行要約を生成する LLM ポート。
 * 実装は infrastructure 層(`llm-summary-generator.ts` が lib/ai の汎用 LLM クライアントへ委譲)。
 *
 * プロバイダ非依存(ADR-0026)。Claude / Gemini いずれの実装でもこのポートを満たす。
 */
import type { ArticleSummaryBullet } from './article-summary';

export type SummaryInput = {
  title: string;
  /** 要約対象の本文または RSS 抜粋(呼び出し側で入力トークン上限までクランプ済み)。 */
  content: string;
};

export type GeneratedSummary = {
  /** 記事全体を1文で表す概要(TL;DR)。 */
  overview: string;
  /** 見出し+説明の箇条書き。 */
  bullets: ArticleSummaryBullet[];
  tags: string[];
};

export interface SummaryGenerator {
  /** 使用モデル ID(`article_summaries.model` に記録する)。 */
  readonly model: string;
  /**
   * 概要(1文)・補足の箇条書き(2〜3個以内)・表示用タグを返す。検証は呼び出し側(usecase)が行う。
   * 失敗時は throw せず空文字・空配列など不正値を返してよい(usecase が failed として記録する)。
   */
  generate(input: SummaryInput): Promise<GeneratedSummary>;
}
