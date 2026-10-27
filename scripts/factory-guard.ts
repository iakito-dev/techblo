/**
 * ソフトウェアファクトリー(ADR-0045)の自動マージ判定。
 *
 * factory/* ブランチの PR に `factory:automerge` ラベルが付いていたら、変更が「小さく・危険領域に触れない」
 * ことを機械的に確かめる。満たせば github-actions[bot] として Approve し、ブランチ保護の
 * 「承認 1 件」を満たして auto-merge を進める。満たさなければ失敗して止める。
 *
 * 判定をエージェントの自己申告に任せず、ここで決定論的に行うのが要点。
 * ルールを変えるときは ADR-0045 と docs/guides/software-factory.md も合わせて直す。
 */

export const FACTORY_BRANCH_PREFIX = 'factory/';
export const AUTOMERGE_LABEL = 'factory:automerge';
export const MAX_CHANGED_FILES = 15;
export const MAX_CHANGED_LINES = 400;

// 本番データ・認証・デプロイ・ハーネス自身に効く領域。ここに触れる PR は必ず人がマージする
const PROTECTED_PATHS: readonly RegExp[] = [
  /^db\//,
  /^drizzle\.config\.ts$/,
  /^lib\/auth/,
  /^lib\/env\.ts$/,
  /^features\/auth\//,
  /^app\/api\//,
  /^app\/(login|signup)\//,
  /^trigger\//,
  /^trigger\.config\.ts$/,
  /^scripts\//,
  /^infra\//,
  /^\.github\//,
  /^\.claude\//,
  /^\.agents\//,
  /^docs\/adr\//,
  /^(AGENTS|CLAUDE)\.md$/,
  /^lefthook\.yml$/,
  /(^|\/)package\.json$/,
  /^bun\.lock$/,
  /^next\.config\.ts$/,
  /^vercel\.json$/,
  /^biome\.json$/,
  /^tsconfig\.json$/,
  /^\.env/,
];

export type ChangedFile = {
  filename: string;
  previousFilename?: string;
  additions: number;
  deletions: number;
};

export type FactoryPr = {
  headRef: string;
  isFromFork: boolean;
  labels: readonly string[];
  files: readonly ChangedFile[];
};

export type Verdict =
  | { kind: 'not-factory' }
  | { kind: 'manual' }
  | { kind: 'eligible' }
  | { kind: 'ineligible'; reasons: string[] };

export function judgeFactoryPr(pr: FactoryPr): Verdict {
  if (pr.isFromFork || !pr.headRef.startsWith(FACTORY_BRANCH_PREFIX))
    return { kind: 'not-factory' };
  if (!pr.labels.includes(AUTOMERGE_LABEL)) return { kind: 'manual' };

  const reasons: string[] = [];
  if (pr.files.length > MAX_CHANGED_FILES) {
    reasons.push(`変更ファイル数 ${pr.files.length} が上限 ${MAX_CHANGED_FILES} を超えています`);
  }
  const lines = pr.files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  if (lines > MAX_CHANGED_LINES) {
    reasons.push(`変更行数 ${lines} が上限 ${MAX_CHANGED_LINES} を超えています`);
  }
  // リネームは移動元も見る(保護領域からファイルを持ち出す変更も止める)
  const paths = pr.files.flatMap((f) =>
    f.previousFilename ? [f.filename, f.previousFilename] : [f.filename],
  );
  for (const path of new Set(paths)) {
    if (PROTECTED_PATHS.some((re) => re.test(path)))
      reasons.push(`保護領域のファイルを変更しています: ${path}`);
  }
  return reasons.length === 0 ? { kind: 'eligible' } : { kind: 'ineligible', reasons };
}

// ─── GitHub Actions から呼ぶ部分 ───────────────────────────────

type GitHubPull = {
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  base: { repo: { full_name: string } };
  labels: { name: string }[];
};
type GitHubFile = {
  filename: string;
  previous_filename?: string;
  additions: number;
  deletions: number;
};
type GitHubReview = { user: { login: string } | null; state: string; commit_id: string };

const BOT_LOGIN = 'github-actions[bot]';

async function github<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...init?.headers,
    },
  });
  if (!res.ok)
    throw new Error(
      `GitHub API ${init?.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`,
    );
  return (await res.json()) as T;
}

async function listAll<T>(token: string, path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const items = await github<T[]>(token, `${path}?per_page=100&page=${page}`);
    all.push(...items);
    if (items.length < 100) return all;
  }
}

// エージェントがラベルを付ける前に、CI と同じルールを手元の差分で確かめる(`--local`)。
// リネームは削除 + 追加として数え、移動元・移動先の両方を保護領域と照らす
async function checkLocal(): Promise<void> {
  const git = Bun.spawn(['git', 'diff', '--numstat', '--no-renames', 'origin/main...HEAD']);
  const out = await new Response(git.stdout).text();
  // 差分が取れないまま 0 ファイル扱いにすると、何でも「条件を満たす」と出てしまう
  if ((await git.exited) !== 0)
    throw new Error('git diff origin/main...HEAD に失敗しました(git fetch origin main を先に実行)');
  const files = out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, filename = ''] = line.split('\t');
      // バイナリは "-" になる。行数は数えず、パスだけ照らす
      return { filename, additions: Number(added) || 0, deletions: Number(deleted) || 0 };
    });
  const verdict = judgeFactoryPr({
    headRef: FACTORY_BRANCH_PREFIX,
    isFromFork: false,
    labels: [AUTOMERGE_LABEL],
    files,
  });
  if (verdict.kind === 'ineligible') {
    for (const reason of verdict.reasons) process.stdout.write(`✗ ${reason}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`✓ 自動マージの条件を満たします(${files.length} ファイル)\n`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--local')) return checkLocal();

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  if (!token || !repo || !prNumber)
    throw new Error('GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER が必要です');

  const base = `/repos/${repo}/pulls/${prNumber}`;
  const pull = await github<GitHubPull>(token, base);
  const files = await listAll<GitHubFile>(token, `${base}/files`);
  const verdict = judgeFactoryPr({
    headRef: pull.head.ref,
    isFromFork: pull.head.repo?.full_name !== pull.base.repo.full_name,
    labels: pull.labels.map((l) => l.name),
    files: files.map((f) => ({
      filename: f.filename,
      previousFilename: f.previous_filename,
      additions: f.additions,
      deletions: f.deletions,
    })),
  });

  switch (verdict.kind) {
    case 'not-factory':
      process.stdout.write('ファクトリーの PR ではないため判定しません\n');
      return;
    case 'manual':
      process.stdout.write(`${AUTOMERGE_LABEL} ラベルがないため、人がマージします\n`);
      return;
    case 'ineligible':
      for (const reason of verdict.reasons) process.stdout.write(`::error::${reason}\n`);
      process.stdout.write(
        `自動マージの条件を満たしません。${AUTOMERGE_LABEL} ラベルを外して人がレビューしてください\n`,
      );
      process.exitCode = 1;
      return;
    case 'eligible': {
      const reviews = await listAll<GitHubReview>(token, `${base}/reviews`);
      const approved = reviews.some(
        (r) =>
          r.user?.login === BOT_LOGIN && r.state === 'APPROVED' && r.commit_id === pull.head.sha,
      );
      if (approved) {
        process.stdout.write('この head はすでに承認済みです\n');
        return;
      }
      await github(token, `${base}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          commit_id: pull.head.sha,
          event: 'APPROVE',
          body: 'Factory guard: 自動マージの条件(ADR-0045)を満たしたため承認します。',
        }),
      });
      process.stdout.write('自動マージの条件を満たしたため承認しました\n');
      return;
    }
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
