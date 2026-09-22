import { describe, expect, it } from 'vitest';
import { stripHtml, toExcerpt } from './strip-html';

describe('stripHtml', () => {
  it('HTML タグを除去する', () => {
    expect(stripHtml('<p>こんにちは<br/>世界</p>')).toBe('こんにちは世界');
  });

  it('数値文字参照(16進)をデコードする', () => {
    expect(stripHtml('&#x30D0;&#x30B0;')).toBe('バグ');
  });

  it('数値文字参照(10進)をデコードする', () => {
    expect(stripHtml('&#12496;&#12464;')).toBe('バグ');
  });

  it('名前付きエンティティをデコードする', () => {
    expect(stripHtml('&quot;quoted&quot; &lt;tag&gt; A&nbsp;B &hellip;')).toBe(
      '"quoted" <tag> A B …',
    );
  });

  it('&amp; は最後に処理し、二重デコードしない', () => {
    // ソース側で「&lt; という文字列」をエスケープした &amp;lt; は < ではなく &lt; のまま残す
    expect(stripHtml('A &amp; B')).toBe('A & B');
    expect(stripHtml('&amp;lt;')).toBe('&lt;');
  });

  it('未対応の名前付きエンティティはそのまま残す', () => {
    expect(stripHtml('&foobar;')).toBe('&foobar;');
  });

  it('不正なコードポイントはエンティティごと落とす', () => {
    expect(stripHtml('A&#x110000;B')).toBe('AB');
  });
});

describe('toExcerpt', () => {
  it('max を超えたら切り詰めて末尾に…を付ける', () => {
    expect(toExcerpt('あ'.repeat(300), 280)).toBe(`${'あ'.repeat(280)}…`);
  });

  it('max 以内はそのまま返す', () => {
    expect(toExcerpt('短いテキスト', 280)).toBe('短いテキスト');
  });

  it('連続空白を1つに圧縮する', () => {
    expect(toExcerpt('A  B\n\nC')).toBe('A B C');
  });
});
