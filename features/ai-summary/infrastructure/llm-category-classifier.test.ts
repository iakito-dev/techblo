import { describe, expect, it } from 'vitest';
import type { LlmTextClient } from '@/lib/ai/llm-client';
import { LlmCategoryClassifier } from './llm-category-classifier';

function classifier(response: string) {
  const llm: LlmTextClient = { model: 'test', complete: async () => response };
  return new LlmCategoryClassifier(llm);
}
const input = { title: 't', overview: 'o', tags: ['x'] };

describe('LlmCategoryClassifier.classify（JSON 抽出）', () => {
  it('素の JSON をパースする', async () => {
    const r = await classifier('{"category":"ai"}').classify(input);
    expect(r).toBe('ai');
  });

  it('```json フェンス付きでも拾う', async () => {
    const r = await classifier('```json\n{"category":"infra"}\n```').classify(input);
    expect(r).toBe('infra');
  });

  it('前後に説明文があっても {...} を抽出する', async () => {
    const r = await classifier('分類結果:\n{"category":"devex"}\nでした').classify(input);
    expect(r).toBe('devex');
  });

  it('category が無ければ空文字になる', async () => {
    const r = await classifier('{}').classify(input);
    expect(r).toBe('');
  });

  it('壊れた出力(JSON でない)は空文字を返す', async () => {
    const r = await classifier('すみません、分類できません').classify(input);
    expect(r).toBe('');
  });

  it('category が文字列以外なら空文字を返す', async () => {
    const r = await classifier('{"category":123}').classify(input);
    expect(r).toBe('');
  });

  it('enum 外の値もそのまま返す(検証は呼び出し側の責務)', async () => {
    const r = await classifier('{"category":"not-a-category"}').classify(input);
    expect(r).toBe('not-a-category');
  });
});
