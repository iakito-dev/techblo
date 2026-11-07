import { afterEach, describe, expect, it, vi } from 'vitest';
import { isProductionDeployment, resolveBaseUrl } from './site-url';

const KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'VERCEL_ENV',
  'NODE_ENV',
] as const;

function clearEnv() {
  for (const k of KEYS) vi.stubEnv(k, undefined as unknown as string);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveBaseUrl', () => {
  it('明示設定の NEXT_PUBLIC_APP_URL を最優先する', () => {
    clearEnv();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://techblo.dev');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'prod.vercel.app');
    vi.stubEnv('VERCEL_URL', 'preview.vercel.app');
    expect(resolveBaseUrl()).toBe('https://techblo.dev');
  });

  it('未設定なら本番の安定ドメインを Vercel のデプロイ URL より優先する', () => {
    clearEnv();
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'prod.vercel.app');
    vi.stubEnv('VERCEL_URL', 'preview.vercel.app');
    expect(resolveBaseUrl()).toBe('https://prod.vercel.app');
  });

  it('本番ドメインも無ければ VERCEL_URL を使う', () => {
    clearEnv();
    vi.stubEnv('VERCEL_URL', 'preview.vercel.app');
    expect(resolveBaseUrl()).toBe('https://preview.vercel.app');
  });

  it('何も無ければ localhost:3000 にフォールバックする', () => {
    clearEnv();
    expect(resolveBaseUrl()).toBe('http://localhost:3000');
  });

  it('末尾スラッシュは取り除く', () => {
    clearEnv();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://techblo.dev//');
    expect(resolveBaseUrl()).toBe('https://techblo.dev');
  });
});

describe('isProductionDeployment', () => {
  it('VERCEL_ENV=production なら true', () => {
    clearEnv();
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isProductionDeployment()).toBe(true);
  });

  it('NODE_ENV=production なら true', () => {
    clearEnv();
    vi.stubEnv('NODE_ENV', 'production');
    expect(isProductionDeployment()).toBe(true);
  });

  it('プレビュー(VERCEL_ENV=preview)かつ非 production ビルドなら false', () => {
    clearEnv();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isProductionDeployment()).toBe(false);
  });
});
