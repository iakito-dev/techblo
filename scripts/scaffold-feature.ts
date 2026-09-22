#!/usr/bin/env bun
/**
 * 新 feature を4層構造(ADR-0010)で生成する feedforward ハーネス。
 * 正しい構造・依存方向を最初から強制し、dependency-cruiser / typecheck を通る雛形を出力する。
 *
 * 使い方: bun run scaffold:feature <kebab-name>
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('使い方: bun run scaffold:feature <kebab-name>(例: notifications)');
  process.exit(1);
}

const kebab = name;
const Pascal = kebab
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const camel = Pascal.charAt(0).toLowerCase() + Pascal.slice(1);
const base = `features/${kebab}`;

if (existsSync(base)) {
  console.error(`❌ 既に存在します: ${base}`);
  process.exit(1);
}

const files: Record<string, string> = {
  // ── domain(外部依存ゼロ)──
  [`${base}/domain/${kebab}.ts`]: `/**
 * ${kebab} のドメインエンティティ。外部依存ゼロ。
 */
export type ${Pascal} = {
  id: string;
};
`,
  [`${base}/domain/${kebab}-repository.ts`]: `import type { ${Pascal} } from './${kebab}';

/**
 * Driven Port。実装は infrastructure 層に置く。
 */
export interface ${Pascal}Repository {
  list(): Promise<${Pascal}[]>;
}
`,
  // ── application(domain にのみ依存)──
  [`${base}/application/dto.ts`]: `import type { ${Pascal} } from '../domain/${kebab}';

/**
 * 表示 DTO。UI が必要とする形だけを持つ。
 */
export type ${Pascal}Dto = {
  id: string;
};

export const to${Pascal}Dto = (x: ${Pascal}): ${Pascal}Dto => ({ id: x.id });
`,
  [`${base}/application/list-${kebab}.ts`]: `import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ${Pascal}Repository } from '../domain/${kebab}-repository';
import { type ${Pascal}Dto, to${Pascal}Dto } from './dto';

/**
 * 一覧取得ユースケース。依存は引数注入(DB なしで単体テスト可)。
 */
export const list${Pascal} =
  (deps: { ${camel}: ${Pascal}Repository }) =>
  async (): Promise<Result<${Pascal}Dto[], CommonError>> => {
    const items = await deps.${camel}.list();
    return ok(items.map(to${Pascal}Dto));
  };
`,
  // ── infrastructure(db を import してよい唯一の層)──
  [`${base}/infrastructure/drizzle-${kebab}-repository.ts`]: `import type { Database } from '@/db/client';
import type { ${Pascal} } from '../domain/${kebab}';
import type { ${Pascal}Repository } from '../domain/${kebab}-repository';

/**
 * ${Pascal}Repository の Drizzle 実装(Driven Adapter)。
 */
export class Drizzle${Pascal}Repository implements ${Pascal}Repository {
  constructor(private readonly db: Database) {}

  async list(): Promise<${Pascal}[]> {
    // TODO: this.db を使って取得を実装する
    void this.db;
    return [];
  }
}
`,
  // ── web(Driving Adapter: RSC / Server Action / ViewModel / components)──
  [`${base}/web/queries.ts`]: `import { db } from '@/db/client';
import type { ${Pascal}Dto } from '../application/dto';
import { list${Pascal} } from '../application/list-${kebab}';
import { Drizzle${Pascal}Repository } from '../infrastructure/drizzle-${kebab}-repository';

/**
 * RSC が呼ぶ composition root。repository を組み立てて usecase に注入する。
 * Server Component / Server Action からのみ import すること。
 */
const ${camel}Repo = new Drizzle${Pascal}Repository(db);

export async function get${Pascal}List(): Promise<${Pascal}Dto[]> {
  const result = await list${Pascal}({ ${camel}: ${camel}Repo })();
  if (!result.ok) throw new Error('${kebab} の取得に失敗しました');
  return result.value;
}
`,
  [`${base}/web/actions.ts`]: `'use server';

// TODO: 変更操作の Server Action をここに置く(usecase を repo 注入で呼ぶ)。
export {};
`,
  [`${base}/web/components/.gitkeep`]: '',
  [`${base}/web/view-models/.gitkeep`]: '',
};

for (const [path, content] of Object.entries(files)) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

console.log(`✅ ${base} を4層構造で生成しました(domain / application / infrastructure / web)`);
console.log('   次の手順:');
console.log('   1. domain の型と Repository(Port)を定義');
console.log('   2. application の usecase / dto を実装');
console.log('   3. infrastructure で Repository を実装(db アクセスはここだけ)');
console.log('   4. bun run depcruise && bun run typecheck で検証');
