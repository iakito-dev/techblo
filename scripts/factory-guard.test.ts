import { describe, expect, it } from 'vitest';
import { AUTOMERGE_LABEL, type ChangedFile, type FactoryPr, judgeFactoryPr } from './factory-guard';

const file = (filename: string, lines = 10, previousFilename?: string): ChangedFile => ({
  filename,
  previousFilename,
  additions: lines,
  deletions: 0,
});

const pr = (overrides: Partial<FactoryPr> = {}): FactoryPr => ({
  headRef: 'factory/fix-typo',
  isFromFork: false,
  labels: [AUTOMERGE_LABEL],
  files: [file('features/feed/web/components/article-card.tsx')],
  ...overrides,
});

describe('judgeFactoryPr', () => {
  it('factory/ ブランチ以外は判定しない', () => {
    expect(judgeFactoryPr(pr({ headRef: 'claude/feature' }))).toEqual({ kind: 'not-factory' });
  });

  it('fork からの PR は判定しない', () => {
    expect(judgeFactoryPr(pr({ isFromFork: true }))).toEqual({ kind: 'not-factory' });
  });

  it('ラベルがなければ人がマージする', () => {
    expect(judgeFactoryPr(pr({ labels: [] }))).toEqual({ kind: 'manual' });
  });

  it('小さく保護領域に触れない変更は自動マージできる', () => {
    expect(judgeFactoryPr(pr())).toEqual({ kind: 'eligible' });
  });

  it.each([
    'db/schema/articles.ts',
    'db/migrations/0042_add.sql',
    'lib/auth.ts',
    'features/auth/web/actions.ts',
    'app/api/revalidate/route.ts',
    'trigger/fetch-feed-articles.ts',
    '.github/workflows/ci.yml',
    '.claude/settings.json',
    'package.json',
    'bun.lock',
    'docs/adr/0045-software-factory.md',
    '.env.example',
  ])('保護領域 %s を変更したら止める', (path) => {
    const verdict = judgeFactoryPr(pr({ files: [file(path)] }));
    expect(verdict.kind).toBe('ineligible');
  });

  it('保護領域からのリネームも止める', () => {
    const verdict = judgeFactoryPr(
      pr({ files: [file('shared/auth-helper.ts', 1, 'lib/auth-helper.ts')] }),
    );
    expect(verdict.kind).toBe('ineligible');
  });

  it('変更行数とファイル数の上限を超えたら止める', () => {
    const tooManyLines = judgeFactoryPr(pr({ files: [file('shared/a.ts', 401)] }));
    const tooManyFiles = judgeFactoryPr(
      pr({ files: Array.from({ length: 16 }, (_, i) => file(`shared/f${i}.ts`, 1)) }),
    );
    expect(tooManyLines.kind).toBe('ineligible');
    expect(tooManyFiles.kind).toBe('ineligible');
  });
});
