import { describe, expect, it } from 'vitest';
import { isBlockedIp, parsePublicHttpUrl } from './safe-url';

describe('isBlockedIp', () => {
  it('ループバックを拒否する', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('::1')).toBe(true);
  });

  it('プライベート帯を拒否する', () => {
    expect(isBlockedIp('10.0.0.5')).toBe(true);
    expect(isBlockedIp('172.16.3.4')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
  });

  it('リンクローカル(クラウドメタデータ)を拒否する', () => {
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
  });

  it('ULA / 未指定 / IPv4-mapped の内部宛てを拒否する', () => {
    expect(isBlockedIp('fd00::1')).toBe(true);
    expect(isBlockedIp('::')).toBe(true);
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('グローバル IP は許可する', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });

  it('IP として解釈できない文字列は安全側で拒否する', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
});

describe('parsePublicHttpUrl', () => {
  it('http/https を許可する', () => {
    expect(parsePublicHttpUrl('https://example.com/feed.xml').ok).toBe(true);
    expect(parsePublicHttpUrl('http://example.com/rss').ok).toBe(true);
  });

  it('http/https 以外を拒否する', () => {
    expect(parsePublicHttpUrl('ftp://example.com/feed').ok).toBe(false);
    expect(parsePublicHttpUrl('file:///etc/passwd').ok).toBe(false);
    expect(parsePublicHttpUrl('javascript:alert(1)').ok).toBe(false);
  });

  it('認証情報を含む URL を拒否する', () => {
    expect(parsePublicHttpUrl('https://user:pass@example.com/feed').ok).toBe(false);
  });

  it('壊れた URL を拒否する', () => {
    expect(parsePublicHttpUrl('not a url').ok).toBe(false);
  });
});
