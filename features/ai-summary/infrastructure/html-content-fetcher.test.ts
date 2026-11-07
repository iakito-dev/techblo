import { afterEach, describe, expect, it, vi } from 'vitest';
import { asArticleId } from '@/shared/type-utils';
import { HtmlContentFetcher } from './html-content-fetcher';

const input = { articleId: asArticleId('a1'), url: 'https://example.test/post' };

/** 本文として採用される下限(200 文字)を超える段落。 */
const LONG = 'これは本文の段落です。'.repeat(30);

const stubHtml = (html: string, status = 200) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(html, { status })));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HtmlContentFetcher', () => {
  it('body から script/style/noscript とタグを除いた本文テキストを full_text として返す', async () => {
    stubHtml(
      `<html><head><title>t</title><style>.a{}</style></head><body>
        <script>var x = 1;</script><noscript>no js</noscript>
        <h1>見出し</h1><p>${LONG}</p></body></html>`,
    );

    const res = await new HtmlContentFetcher().fetch(input);

    expect(res?.source).toBe('full_text');
    expect(res?.text.startsWith('見出し これは本文の段落です。')).toBe(true);
    expect(res?.text).not.toMatch(/var x|no js|\.a\{\}|<|>/);
  });

  it('主要な HTML エンティティを戻し、連続する空白を 1 つに畳む', async () => {
    stubHtml(`<body><p>A&nbsp;&amp;&nbsp;B &lt;tag&gt;</p>\n\n   <p>${LONG}</p></body>`);

    const res = await new HtmlContentFetcher().fetch(input);

    expect(res?.text.startsWith('A & B <tag> これは')).toBe(true);
    expect(res?.text).not.toMatch(/\s{2,}/);
  });

  it('抽出した本文が 200 文字未満なら null(抜粋フォールバック)を返す', async () => {
    stubHtml('<body><p>短すぎる本文</p></body>');

    expect(await new HtmlContentFetcher().fetch(input)).toBeNull();
  });

  it('HTTP エラーなら null を返す', async () => {
    stubHtml('not found', 404);

    expect(await new HtmlContentFetcher().fetch(input)).toBeNull();
  });

  it('ネットワーク例外でも throw せず null を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    expect(await new HtmlContentFetcher().fetch(input)).toBeNull();
  });
});
