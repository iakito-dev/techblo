import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Unit テスト用設定。
 * Integration テストは vitest.integration.config.ts を使う。
 */
export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    globals: false,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/db/migrations/**',
      'e2e/**',
      '**/*.integration.test.ts',
    ],
    passWithNoTests: true,
    // 変換結果を node_modules/.vitest-cache に永続化し、2回目以降の実行で transform を省く。
    fsModuleCache: true,
    // zod 4 を vite の依存最適化に任せると barrel 初期化で z が undefined になる。
    // inline 指定で変換パイプラインに通して回避。
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: ['**/node_modules/**', '**/*.config.*', '**/*.d.ts', 'db/migrations/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
