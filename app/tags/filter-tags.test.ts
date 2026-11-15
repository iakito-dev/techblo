import { describe, expect, it } from 'vitest';
import { filterTags } from './filter-tags';

const TAGS = [
  { tag: 'React', count: 30 },
  { tag: 'React Native', count: 12 },
  { tag: 'TypeScript', count: 20 },
  { tag: 'パフォーマンス', count: 8 },
];

describe('filterTags', () => {
  it('空クエリ・空白だけのクエリは全件を同じ順で返す', () => {
    expect(filterTags(TAGS, '')).toEqual(TAGS);
    expect(filterTags(TAGS, '   ')).toEqual(TAGS);
  });

  it('大文字小文字を区別せず部分一致で残し、記事数順を保つ', () => {
    expect(filterTags(TAGS, 'react').map((t) => t.tag)).toEqual(['React', 'React Native']);
    expect(filterTags(TAGS, 'script').map((t) => t.tag)).toEqual(['TypeScript']);
  });

  it('全角英字・半角カナでも一致する(NFKC)', () => {
    expect(filterTags(TAGS, 'ＲＥＡＣＴ').map((t) => t.tag)).toEqual(['React', 'React Native']);
    expect(filterTags(TAGS, 'ﾊﾟﾌｫｰﾏﾝｽ').map((t) => t.tag)).toEqual(['パフォーマンス']);
  });

  it('先頭の # は無視する(全角の ＃ も)', () => {
    expect(filterTags(TAGS, '#TypeScript').map((t) => t.tag)).toEqual(['TypeScript']);
    expect(filterTags(TAGS, '＃react').map((t) => t.tag)).toEqual(['React', 'React Native']);
    expect(filterTags(TAGS, '#')).toEqual(TAGS);
  });

  it('一致しなければ空配列', () => {
    expect(filterTags(TAGS, 'Rust')).toEqual([]);
  });

  it('入力配列を変更しない', () => {
    const input = [...TAGS];
    filterTags(input, '');
    expect(input).toEqual(TAGS);
  });
});
