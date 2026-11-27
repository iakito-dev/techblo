import { describe, expect, it } from 'vitest';
import { resolveLoginExitHref } from './login-exit';

describe('resolveLoginExitHref', () => {
  it('callbackURL が無ければトップへ戻す', () => {
    expect(resolveLoginExitHref(undefined)).toBe('/');
    expect(resolveLoginExitHref('')).toBe('/');
  });

  it('同一オリジンのパスはそのまま戻り先にする', () => {
    expect(resolveLoginExitHref('/settings')).toBe('/settings');
    expect(resolveLoginExitHref('/settings/feeds')).toBe('/settings/feeds');
    expect(resolveLoginExitHref('/?company=mercari#top')).toBe('/?company=mercari#top');
  });

  it('別オリジンになりうる値はトップへ落とす', () => {
    expect(resolveLoginExitHref('https://evil.example/')).toBe('/');
    expect(resolveLoginExitHref('//evil.example/')).toBe('/');
    expect(resolveLoginExitHref('/\\evil.example/')).toBe('/');
    expect(resolveLoginExitHref('javascript:alert(1)')).toBe('/');
  });

  it('ログイン画面自身を指すときはループしないようトップへ落とす', () => {
    expect(resolveLoginExitHref('/login')).toBe('/');
    expect(resolveLoginExitHref('/login?callbackURL=%2F')).toBe('/');
    expect(resolveLoginExitHref('/signup')).toBe('/');
    // 前方一致で別のパスまで巻き込まない
    expect(resolveLoginExitHref('/loginhelp')).toBe('/loginhelp');
  });
});
