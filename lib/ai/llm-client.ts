import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

/**
 * ベンダー非依存の汎用 LLM テキストクライアント(ADR-0026)。
 *
 * features を import しない横断 infrastructure。feature 固有のプロンプト整形はここには置かず、
 * feature 側の infrastructure(`llm-summary-generator.ts`)が組み立てて `complete` を呼ぶ。
 *
 * 既定アダプタは Gemini(@ai-sdk/google)。provider を差し替えるだけで別ベンダーに移行できる。
 * `GEMINI_API_KEY` 未設定の間は未設定クライアント(complete で reject)を返す。
 */

/** AI_SUMMARY_MODEL 未設定時のデフォルト。最新の正確な ID は Google AI Studio で確認すること。 */
export const DEFAULT_SUMMARY_MODEL = 'gemini-3.1-flash-lite';

export type LlmCompletionInput = {
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
};

export interface LlmTextClient {
  /** 使用モデル ID(`article_summaries.model` に記録される)。 */
  readonly model: string;
  complete(input: LlmCompletionInput): Promise<string>;
}

class NotConfiguredLlmClient implements LlmTextClient {
  constructor(readonly model: string) {}

  complete(): Promise<string> {
    return Promise.reject(
      new Error(
        'LLM provider not configured: set GEMINI_API_KEY for the Gemini adapter in lib/ai/llm-client.ts',
      ),
    );
  }
}

/** Gemini(@ai-sdk/google)アダプタ。汎用テキスト生成のみを担い、プロンプト整形は feature 側。 */
class GeminiLlmClient implements LlmTextClient {
  private readonly provider: ReturnType<typeof createGoogleGenerativeAI>;
  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.provider = createGoogleGenerativeAI({ apiKey });
  }

  async complete(input: LlmCompletionInput): Promise<string> {
    const { text } = await generateText({
      model: this.provider(this.model),
      instructions: input.system,
      prompt: input.prompt,
      maxOutputTokens: input.maxOutputTokens,
      providerOptions: {
        // 3行要約に思考(thinking)は不要。既定で有効な思考が小さい出力枠を食い尽くし、
        // 本文テキストが空になるのを防ぐ(コスト・レイテンシも削減)。
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });
    return text;
  }
}

/**
 * env からプロバイダを解決して LLM クライアントを生成する。
 * GEMINI_API_KEY 未設定なら未設定クライアント(complete で reject)を返す。
 */
export function createLlmClient(config?: { geminiApiKey?: string; model?: string }): LlmTextClient {
  const apiKey = config?.geminiApiKey ?? process.env.GEMINI_API_KEY;
  const model = config?.model ?? process.env.AI_SUMMARY_MODEL ?? DEFAULT_SUMMARY_MODEL;
  if (!apiKey) return new NotConfiguredLlmClient(model);
  return new GeminiLlmClient(apiKey, model);
}
