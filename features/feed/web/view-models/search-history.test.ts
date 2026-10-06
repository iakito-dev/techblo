import { describe, expect, it } from 'vitest';
import {
  addSearchHistory,
  clearSearchHistory,
  parseSearchHistory,
  removeSearchHistory,
  SEARCH_HISTORY_MAX,
  SEARCH_HISTORY_TERM_MAX,
} from './search-history';

describe('addSearchHistory', () => {
  it('trim して先頭に追加する', () => {
    expect(addSearchHistory(['a'], '  react ')).toEqual(['react', 'a']);
  });

  it('空・空白のみは無視する', () => {
    expect(addSearchHistory(['a'], '   ')).toEqual(['a']);
  });

  it('NFKC + 小文字で同一視し、重複は先頭へ移動する', () => {
    expect(addSearchHistory(['b', 'React', 'c'], 'ＲＥＡＣＴ')).toEqual(['ＲＥＡＣＴ', 'b', 'c']);
  });

  it('最大件数を超えたら古いものから落とす', () => {
    const list = Array.from({ length: SEARCH_HISTORY_MAX }, (_, i) => `t${i}`);
    const next = addSearchHistory(list, 'new');
    expect(next).toHaveLength(SEARCH_HISTORY_MAX);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`t${SEARCH_HISTORY_MAX - 1}`);
  });

  it('上限文字数で切る', () => {
    const [term] = addSearchHistory([], 'あ'.repeat(SEARCH_HISTORY_TERM_MAX + 20));
    expect(Array.from(term ?? '')).toHaveLength(SEARCH_HISTORY_TERM_MAX);
  });
});

describe('removeSearchHistory / clearSearchHistory', () => {
  it('同一視できる語を削除する', () => {
    expect(removeSearchHistory(['Go', 'rust'], 'ｇｏ')).toEqual(['rust']);
  });

  it('全消去は空配列', () => {
    expect(clearSearchHistory()).toEqual([]);
  });
});

describe('parseSearchHistory', () => {
  it('null / 空は空配列', () => {
    expect(parseSearchHistory(null)).toEqual([]);
    expect(parseSearchHistory('')).toEqual([]);
  });

  it('壊れた JSON は空配列', () => {
    expect(parseSearchHistory('{oops')).toEqual([]);
  });

  it('配列以外は空配列', () => {
    expect(parseSearchHistory('{"a":1}')).toEqual([]);
    expect(parseSearchHistory('"str"')).toEqual([]);
  });

  it('文字列以外・空文字・重複は捨てる', () => {
    expect(parseSearchHistory(JSON.stringify(['a', 1, null, '', ' ', 'A', 'b']))).toEqual([
      'a',
      'b',
    ]);
  });

  it('最大件数で切る', () => {
    const raw = JSON.stringify(Array.from({ length: 20 }, (_, i) => `t${i}`));
    expect(parseSearchHistory(raw)).toHaveLength(SEARCH_HISTORY_MAX);
  });
});
