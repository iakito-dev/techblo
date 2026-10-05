/**
 * trigger.dev CLI のラッパー。
 * 実行: bun run trigger:dev / bun run trigger:deploy(= bun run scripts/trigger-cli.ts <dev|deploy> [...args])
 *
 * CLI は @trigger.dev/sdk と同じ版でないと「Version mismatch detected」で中止されるため、
 * `@latest` ではなくインストール済み SDK の版に合わせて起動する。
 * bun は .env.local を自動で読むので、TRIGGER_PROJECT_REF 等はそのまま子プロセスへ渡る。
 */
import { version } from '@trigger.dev/sdk/package.json';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('使い方: bun run scripts/trigger-cli.ts <dev|deploy> [...args]');
  process.exit(1);
}

// CLI が同梱する esbuild のネイティブバイナリは node のアーキテクチャに合わせて入るので、bunx ではなく npx で動かす
const proc = Bun.spawn(['npx', '--yes', `trigger.dev@${version}`, ...args], {
  stdio: ['inherit', 'inherit', 'inherit'],
});
process.exit(await proc.exited);
