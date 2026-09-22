/**
 * アーキテクチャ規約の自動強制(ADR-0010 / ADR-0002)。
 * 依存方向を静的に検査し、違反を lefthook(pre-commit)と CI で止める。
 *
 * レイヤー依存は内向きのみ: web / infrastructure → application → domain
 * 実行: bun run depcruise
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        '循環依存は禁止(保守性・ビルド順序の崩壊を防ぐ)。db/schema は Drizzle の relations() による宣言的相互参照のため除外',
      severity: 'error',
      from: { pathNot: '^db/schema/' },
      to: { circular: true },
    },
    {
      name: 'domain-no-io',
      comment: 'domain 層は I/O(db / lib)に依存しない。純粋に保つ(ADR-0010)',
      severity: 'error',
      from: { path: '^features/[^/]+/domain/' },
      to: { path: '^(db|lib)/' },
    },
    {
      name: 'domain-no-frameworks',
      comment: 'domain 層はフレームワーク(next/react/drizzle)に依存しない(ADR-0010)',
      severity: 'error',
      from: { path: '^features/[^/]+/domain/' },
      to: { dependencyTypes: ['npm'], path: 'node_modules/(react|react-dom|next|drizzle-orm)' },
    },
    {
      name: 'domain-inward-only',
      comment: 'domain は同 feature の application/infrastructure/web に依存しない(最内層)',
      severity: 'error',
      from: { path: '^features/([^/]+)/domain/' },
      to: { path: '^features/$1/(application|infrastructure|web)/' },
    },
    {
      name: 'application-inward-only',
      comment:
        'application は infrastructure/web に依存しない。Repository は domain の Port 経由(ADR-0010)',
      severity: 'error',
      from: { path: '^features/([^/]+)/application/' },
      to: { path: '^features/$1/(infrastructure|web)/' },
    },
    {
      name: 'no-cross-feature',
      comment: 'features/A は features/B を import しない。共有は shared/ へ(ADR-0002)',
      severity: 'error',
      from: { path: '^features/([^/]+)/' },
      to: { path: '^features/([^/]+)/', pathNot: '^features/$1/' },
    },
    {
      name: 'lib-no-features',
      comment: 'lib は feature を import しない(逆流防止。保存処理等は注入で受け取る。ADR-0010)',
      severity: 'error',
      from: { path: '^lib/' },
      to: { path: '^features/' },
    },
    {
      name: 'app-no-direct-db',
      comment: 'app は db を直叩きしない。infrastructure(Repository)経由(ADR-0010)',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: '^db/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // tsconfig の paths(@/* → ./*)を解決
    tsConfig: { fileName: 'tsconfig.json' },
    // import type も依存として追跡(domain が型だけ drizzle を import するのも検出)
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  },
};
