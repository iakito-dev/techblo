import { describe, expect, it } from 'vitest';
import type { LlmTextClient } from '@/lib/ai/llm-client';
import { LlmSummaryGenerator } from './llm-summary-generator';

function gen(response: string) {
  const llm: LlmTextClient = { model: 'test', complete: async () => response };
  return new LlmSummaryGenerator(llm);
}
const input = { title: 't', content: 'c' };

describe('LlmSummaryGenerator.generate（JSON 抽出と正規化）', () => {
  it('素の JSON をパースする', async () => {
    const r = await gen(
      '{"overview":"概要","bullets":[{"heading":"a","detail":"da"},{"heading":"b","detail":"db"}],"tags":["AWS"]}',
    ).generate(input);
    expect(r).toEqual({
      overview: '概要',
      bullets: [
        { heading: 'a', detail: 'da' },
        { heading: 'b', detail: 'db' },
      ],
      tags: ['AWS'],
    });
  });

  it('```json フェンス付きでも拾う', async () => {
    const r = await gen(
      '```json\n{"overview":"概要","bullets":[{"heading":"a","detail":"d"}],"tags":["Go"]}\n```',
    ).generate(input);
    expect(r).toEqual({ overview: '概要', bullets: [{ heading: 'a', detail: 'd' }], tags: ['Go'] });
  });

  it('前後に説明文があっても {...} を抽出する', async () => {
    const r = await gen(
      '以下が要約です:\n{"overview":"概要","bullets":[{"heading":"a","detail":"d"}],"tags":[]}\nよろしく',
    ).generate(input);
    expect(r).toEqual({ overview: '概要', bullets: [{ heading: 'a', detail: 'd' }], tags: [] });
  });

  it('見出しの箇条書き記号は除去される', async () => {
    const r = await gen(
      '{"overview":"概要","bullets":[{"heading":"・要点1","detail":"説明"}],"tags":[]}',
    ).generate(input);
    expect(r.bullets).toEqual([{ heading: '要点1', detail: '説明' }]);
  });

  it('概要が無ければ overview は空文字になる', async () => {
    const r = await gen('{"bullets":[{"heading":"a","detail":"d"}],"tags":[]}').generate(input);
    expect(r).toEqual({ overview: '', bullets: [{ heading: 'a', detail: 'd' }], tags: [] });
  });

  it('壊れた出力(JSON でない)は空を返す', async () => {
    const r = await gen('すみません、要約できません').generate(input);
    expect(r).toEqual({ overview: '', bullets: [], tags: [] });
  });

  it('見出し/説明が欠ける項目や非オブジェクトは除外する', async () => {
    const r = await gen(
      '{"overview":"概要","bullets":[{"heading":"a","detail":"d"},"x",{"heading":"b"},null],"tags":["x",false]}',
    ).generate(input);
    expect(r).toEqual({ overview: '概要', bullets: [{ heading: 'a', detail: 'd' }], tags: ['x'] });
  });
});
