import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLlmClient, DEFAULT_SUMMARY_MODEL } from './llm-client';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createLlmClient', () => {
  it('API キー未設定なら complete が設定方法つきのエラーで reject する', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const client = createLlmClient();

    await expect(client.complete({ prompt: 'x' })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('モデル未指定なら既定モデルを使う', () => {
    // vi.stubEnv は undefined を渡すとそのキーを削除する
    vi.stubEnv('AI_SUMMARY_MODEL', undefined);
    vi.stubEnv('GEMINI_API_KEY', undefined);
    expect(createLlmClient().model).toBe(DEFAULT_SUMMARY_MODEL);
  });

  it('引数の model は環境変数より優先される', () => {
    vi.stubEnv('AI_SUMMARY_MODEL', 'from-env');
    expect(createLlmClient({ model: 'from-arg' }).model).toBe('from-arg');
  });

  it('環境変数のモデルは既定より優先される', () => {
    vi.stubEnv('AI_SUMMARY_MODEL', 'from-env');
    expect(createLlmClient().model).toBe('from-env');
  });

  it('API キーがあれば例外なくクライアントを生成し、モデル ID を保持する', () => {
    const client = createLlmClient({ geminiApiKey: 'dummy', model: 'm1' });
    expect(client.model).toBe('m1');
  });
});
