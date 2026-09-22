/**
 * Driven Port。保存済み要約(title + overview + tags)から記事カテゴリを1つ選ぶ LLM ポート。
 * 実装は infrastructure 層(`llm-category-classifier.ts` が lib/ai の汎用 LLM クライアントへ委譲)。
 *
 * 要約生成(本文取得 + LLM)には相乗りさせず、独立した分類ステップとして呼び出す
 * (ADR-0034)。プロバイダ非依存(ADR-0026 と同じ方針)。
 */
export type ClassifyInput = {
  title: string;
  overview: string;
  tags: string[];
};

export interface CategoryClassifier {
  /** 使用モデル ID。 */
  readonly model: string;
  /**
   * カテゴリのキー文字列を1つ返す。検証(enum に収まるか)は呼び出し側(usecase)が
   * `parseCategory` で行う。失敗時は throw せず空文字・不正値を返してよい。
   */
  classify(input: ClassifyInput): Promise<string>;
}
