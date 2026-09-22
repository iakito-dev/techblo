import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Integration テスト用設定(`*.integration.test.ts` のみ)。
 * 実 DB(Neon のテストブランチ)に繋ぐ想定なので unit とは分離し、
 * unit 側(vitest.config.ts)では同名パターンを exclude している。
 * まだテストが無い状態でも CI を落とさないよう passWithNoTests を有効にする。
 */
export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    globals: false,
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/db/migrations/**', 'e2e/**'],
    passWithNoTests: true,
    // unit 側と同じ理由(zod 4 の barrel 初期化対策)。
    server: {
      deps: {
        inline: ['zod'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
