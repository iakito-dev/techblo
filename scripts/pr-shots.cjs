/**
 * サンドボックス(scripts/sandbox.sh)の画面を、PR の変更前後の比較用に撮る(ADR-0047)。
 *
 *   node scripts/pr-shots.cjs --out <dir> --label before|after [--dark] name=/path ...
 *
 * 各ページをモバイル(390px)とデスクトップ(1280px)で撮る。--dark でダークテーマも撮る。
 * 出力は <dir>/<name>-<mobile|desktop>-<light|dark>-<label>.png。
 * 変更前は main(または PR の分岐元)、変更後は PR のブランチを checkout して、同じ引数で 2 回呼ぶ。
 * クラウド環境では playwright がグローバルに入っているため、依存に足さず require で読む。
 */
const { chromium } = require('playwright');

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 900 },
};

function parseArgs(argv) {
  const opts = { out: '', label: '', dark: false, base: 'http://localhost:3100', pages: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') opts.out = argv[++i] ?? '';
    else if (arg === '--label') opts.label = argv[++i] ?? '';
    else if (arg === '--base') opts.base = argv[++i] ?? opts.base;
    else if (arg === '--dark') opts.dark = true;
    else if (arg.includes('=')) {
      const [name, path] = arg.split(/=(.*)/s);
      opts.pages.push({ name, path });
    }
  }
  if (!opts.out || !['before', 'after'].includes(opts.label) || opts.pages.length === 0) {
    throw new Error(
      'usage: node scripts/pr-shots.cjs --out <dir> --label before|after [--dark] name=/path ...',
    );
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const fs = require('node:fs');
  fs.mkdirSync(opts.out, { recursive: true });
  const themes = opts.dark ? ['light', 'dark'] : ['light'];
  const browser = await chromium.launch();
  let failed = false;
  try {
    for (const page of opts.pages) {
      for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
        for (const theme of themes) {
          const context = await browser.newContext({ viewport, colorScheme: theme });
          const tab = await context.newPage();
          const errors = [];
          tab.on('pageerror', (e) => errors.push(e.message));
          const res = await tab.goto(new URL(page.path, opts.base).toString(), {
            waitUntil: 'networkidle',
            timeout: 120_000,
          });
          const file = `${opts.out}/${page.name}-${vpName}-${theme}-${opts.label}.png`;
          await tab.screenshot({ path: file });
          const note = errors.length > 0 ? ` pageerror: ${errors.join(' / ')}` : '';
          if (errors.length > 0) failed = true;
          process.stdout.write(`${file} (HTTP ${res?.status() ?? '?'})${note}\n`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
