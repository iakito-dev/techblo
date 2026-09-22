import { describe, expect, it } from 'vitest';
import {
  MAX_OVERVIEW_LENGTH,
  parseBullets,
  parseCategory,
  parseOverview,
  parseTags,
} from './article-summary';

describe('parseOverview（概要1文の検証）', () => {
  it('通常の1文は通す', () => {
    const r = parseOverview('リーダー/ライター分離でDB負荷を分散した事例の解説です');
    expect(r.ok).toBe(true);
  });

  it('空文字・空白のみは failed', () => {
    expect(parseOverview('').ok).toBe(false);
    expect(parseOverview('   ').ok).toBe(false);
  });

  it('文字列以外は failed', () => {
    expect(parseOverview(null).ok).toBe(false);
    expect(parseOverview(['概要']).ok).toBe(false);
  });

  it('上限超過は failed', () => {
    expect(parseOverview('あ'.repeat(MAX_OVERVIEW_LENGTH + 1)).ok).toBe(false);
  });
});

describe('parseBullets（見出し+説明の検証・定型見出しの除去）', () => {
  const item = (heading: string, detail = '具体的な説明です。') => ({ heading, detail });

  it('見出しが定型文の項目は全部落ちて failed になる', () => {
    const r = parseBullets([
      item('記事の論点を短く把握できる要約です'),
      item('関連技術や運用上の観点を確認できます'),
      item('元記事へ進む前の判断材料になります'),
    ]);
    expect(r.ok).toBe(false);
  });

  it('定型見出しが混ざっても、中身のある項目は残す', () => {
    const good = item('リーダー/ライター分離でDB負荷を分散');
    const r = parseBullets([good, item('元記事へ進む前の判断材料になります')]);
    expect(r).toEqual({ ok: true, bullets: [good] });
  });

  it('見出しか説明が空の項目は failed', () => {
    expect(parseBullets([{ heading: '見出しのみ', detail: '' }]).ok).toBe(false);
    expect(parseBullets([{ heading: '', detail: '説明のみ' }]).ok).toBe(false);
  });

  it('通常の3項目はそのまま通す', () => {
    const bullets = [item('要点1'), item('要点2'), item('要点3')];
    expect(parseBullets(bullets)).toEqual({ ok: true, bullets });
  });
});

describe('parseTags（表示用タグの検証）', () => {
  it('重複は除去する', () => {
    const r = parseTags(['AWS', 'AWS', 'Go']);
    expect(r).toEqual({ ok: true, tags: ['AWS', 'Go'] });
  });

  it('6件以上は failed', () => {
    const r = parseTags(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(r.ok).toBe(false);
  });
});

describe('parseCategory（カテゴリ出力の検証）', () => {
  it('7キーいずれも通す', () => {
    for (const key of ['ai', 'infra', 'devex', 'app', 'security', 'org', 'event']) {
      expect(parseCategory(key)).toEqual({ ok: true, category: key });
    }
  });

  it('前後の空白は trim する', () => {
    expect(parseCategory(' ai ')).toEqual({ ok: true, category: 'ai' });
  });

  it('enum 外の文字列は failed', () => {
    expect(parseCategory('not-a-category').ok).toBe(false);
  });

  it('文字列以外・空文字は failed', () => {
    expect(parseCategory(null).ok).toBe(false);
    expect(parseCategory('').ok).toBe(false);
  });
});
