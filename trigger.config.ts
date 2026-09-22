import { defineConfig } from '@trigger.dev/sdk';

/**
 * trigger.dev設定。はてブ数の定期取得タスク(ADR-0018)を動かす。
 * project ref は秘匿のため env から読む(未設定はローカル雛形時のプレースホルダ)。
 * インフラ設定なので next.config / drizzle.config 同様 process.env を直接参照する。
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_REPLACE_WITH_YOUR_REF',
  dirs: ['./trigger'],
  maxDuration: 300,
});
