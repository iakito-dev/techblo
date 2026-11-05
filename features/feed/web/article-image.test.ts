import { describe, expect, it } from 'vitest';
import { articleFallbackImage, articleImageSrc } from './article-image';

describe('articleImageSrc', () => {
  it('OGP 画像があればそれを使う', () => {
    expect(articleImageSrc({ id: 'a1', ogImage: 'https://img.test/og.png' })).toBe(
      'https://img.test/og.png',
    );
  });

  it('OGP 画像が無ければ生成プレースホルダ(/api/og/{id})に落とす', () => {
    expect(articleImageSrc({ id: 'a1', ogImage: null })).toBe('/api/og/a1');
    expect(articleFallbackImage('a1')).toBe('/api/og/a1');
  });
});
