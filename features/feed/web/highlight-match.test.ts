import { describe, expect, it } from 'vitest';
import { splitHighlight } from './highlight-match';

describe('splitHighlight', () => {
  it('検索語が無ければ全体を 1 片で返す', () => {
    expect(splitHighlight('React 入門', undefined)).toEqual([{ text: 'React 入門', match: false }]);
    expect(splitHighlight('React 入門', '   ')).toEqual([{ text: 'React 入門', match: false }]);
  });

  it('一致が無ければ全体を 1 片で返す', () => {
    expect(splitHighlight('Go 入門', 'react')).toEqual([{ text: 'Go 入門', match: false }]);
  });

  it('大文字小文字を区別せず、元の表記のまま一致箇所を切り出す', () => {
    expect(splitHighlight('React と react hooks', 'REACT')).toEqual([
      { text: 'React', match: true },
      { text: ' と ', match: false },
      { text: 'react', match: true },
      { text: ' hooks', match: false },
    ]);
  });

  it('検索語の前後の空白は無視し、和文でも一致する', () => {
    expect(splitHighlight('社内検索の精度を上げる', ' 検索 ')).toEqual([
      { text: '社内', match: false },
      { text: '検索', match: true },
      { text: 'の精度を上げる', match: false },
    ]);
  });

  it('正規表現のメタ文字を文字どおりに扱う', () => {
    expect(splitHighlight('C++ と C# の比較', 'c++')).toEqual([
      { text: 'C++', match: true },
      { text: ' と C# の比較', match: false },
    ]);
    expect(splitHighlight('a.b', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ]);
  });

  it('空白を含む検索語は語全体で突き合わせる(検索と同じ部分一致)', () => {
    expect(splitHighlight('React Server Components 移行', 'server components')).toEqual([
      { text: 'React ', match: false },
      { text: 'Server Components', match: true },
      { text: ' 移行', match: false },
    ]);
  });

  it('全体が一致すれば 1 片を強調する', () => {
    expect(splitHighlight('LINEヤフー', 'lineヤフー')).toEqual([
      { text: 'LINEヤフー', match: true },
    ]);
  });

  it('検索と同じく NFKC で正規化した検索語で突き合わせる', () => {
    expect(splitHighlight('React 入門', 'ＲＥＡＣＴ')).toEqual([
      { text: 'React', match: true },
      { text: ' 入門', match: false },
    ]);
  });
});
