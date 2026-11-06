import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('本番では level・msg・ctx・ts を 1 行の JSON で出す', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.warn('feed failed', { slug: 'acme' });

    const line = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(line).toMatchObject({ level: 'warn', msg: 'feed failed', slug: 'acme' });
    expect(Number.isNaN(Date.parse(line.ts))).toBe(false);
  });

  it('開発では人間可読な [level] msg 形式で出し、ctx が無ければ空文字を添える', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('hello');
    logger.error('bad', { code: 1 });

    expect(spy.mock.calls[0]).toEqual(['[info] hello', '']);
    expect(spy.mock.calls[1]).toEqual(['[error] bad', { code: 1 }]);
  });
});
