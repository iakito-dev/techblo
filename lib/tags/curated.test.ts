import { describe, expect, it } from 'vitest';
import { CURATED_TAGS, expandTag } from './curated';

describe('expandTag', () => {
  it('canonical ラベルを類義語群へ展開する(label 自身を含む)', () => {
    expect(expandTag('AI・LLM')).toEqual(['AI・LLM', '生成AI', 'AI', 'LLM', '機械学習']);
    expect(expandTag('テスト')).toEqual(['テスト', 'QA', 'テスト自動化']);
  });

  it('別名を持たないタグは自身のみを返す', () => {
    expect(expandTag('SRE')).toEqual(['SRE']);
  });

  it('キュレーション外のタグは完全一致フォールバック(自身のみ)', () => {
    expect(expandTag('存在しないタグ')).toEqual(['存在しないタグ']);
  });
});

describe('CURATED_TAGS', () => {
  it('label は一意', () => {
    const labels = CURATED_TAGS.map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('aliases は label 自身を必ず含む(展開漏れ防止)', () => {
    for (const t of CURATED_TAGS) {
      expect(t.aliases).toContain(t.label);
    }
  });
});
