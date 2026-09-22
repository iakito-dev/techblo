import { describe, expect, test } from 'vitest';
import { SUPPORT_LINKS } from './support-links';

describe('SUPPORT_LINKS', () => {
  test('includes the product, support, and legal destinations in display order', () => {
    expect(SUPPORT_LINKS).toEqual([
      { href: '/lp', label: 'サービス紹介' },
      { href: '/about', label: '運営者情報・お問い合わせ' },
      { href: '/privacy', label: 'プライバシーポリシー' },
      { href: '/terms', label: '利用規約' },
    ]);
  });
});
