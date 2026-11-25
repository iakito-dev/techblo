import { describe, expect, it } from 'vitest';
import { resolveCompanyFeedIntro } from './company-feed-intro';

const base = {
  slug: 'andpad',
  name: 'ANDPAD',
  description: 'ANDPAD Tech Blog',
  siteUrl: 'https://tech.andpad.co.jp/',
};

describe('resolveCompanyFeedIntro', () => {
  it('紹介文・公式ブログのホスト名・企業別 RSS を返す', () => {
    expect(resolveCompanyFeedIntro(base)).toEqual({
      description: 'ANDPAD Tech Blog',
      siteUrl: 'https://tech.andpad.co.jp/',
      siteHost: 'tech.andpad.co.jp',
      rssPath: '/companies/andpad/feed.xml',
    });
  });

  it('ホスト名の先頭の www. を落とす', () => {
    expect(resolveCompanyFeedIntro({ ...base, siteUrl: 'https://www.m3tech.blog/' }).siteHost).toBe(
      'm3tech.blog',
    );
  });

  it('紹介文が空・企業名と同じなら出さない', () => {
    expect(resolveCompanyFeedIntro({ ...base, description: null }).description).toBeNull();
    expect(resolveCompanyFeedIntro({ ...base, description: '  ' }).description).toBeNull();
    expect(resolveCompanyFeedIntro({ ...base, description: 'ANDPAD' }).description).toBeNull();
  });

  it('http(s) 以外・不正な URL は公式ブログのリンクを出さない', () => {
    for (const siteUrl of ['javascript:alert(1)', 'not a url', '']) {
      const view = resolveCompanyFeedIntro({ ...base, siteUrl });
      expect(view.siteUrl).toBeNull();
      expect(view.siteHost).toBeNull();
    }
  });

  it('slug を RSS のパスでエスケープする', () => {
    expect(resolveCompanyFeedIntro({ ...base, slug: 'a b' }).rssPath).toBe(
      '/companies/a%20b/feed.xml',
    );
  });
});
