# ADR-0007: CI/CD戦略

- **状態**: Accepted
- **決定日**: 2026-05-28

## 背景

個人開発でも CI/CD は事故を防ぐ最低限の防御線。導入のオーバーヘッドと得られる安心感のバランスを取りつつ、AIエージェントによるコミットも安全に受け入れる必要がある。

## 検討した選択肢

### A. CI なし(手動でlint/test)

- 最速で開始可能
- 人間が忘れるとPRに混入
- AIエージェントの変更が無検証でmergeされるリスク

### B. GitHub Actions で必須ゲート

- セットアップにファイル数本
- branch protection で「CI通らなければmerge不可」を強制
- AIでも人間でも同じ品質ゲート

### C. CircleCI / Buildkite 等の外部CI

- 高機能だが個人開発で過剰
- 無料枠の制約がGitHub Actionsより厳しい

## 決定

**B. GitHub Actions + branch protection** を採用。

### 必須チェック

| ジョブ | 内容 |
|---|---|
| lint | Biome check + format確認 |
| typecheck | tsc --noEmit |
| test | unit + integration |
| build | Next.js production build |

### 強制ルール

- main直push禁止、PR必須
- 上記4ジョブのstatus check必須
- linear history(squash merge)
- 1MB超ファイルのpushを拒否

### 自動化レイヤー

- **pre-commit**: lefthook で format/lint(staged files のみ)
- **pre-push**: lefthook で unit test
- **CI(PR時)**: 上記必須チェック
- **CI(main merge後)**: production deploy + E2E

## 結果

- ✅ AIエージェントでも人間でも同じ品質ゲートを通る
- ✅ 過去のミスを再発防止(lint pass前提で読める)
- ✅ Vercel + Neon の自動 preview と組み合わせて事故防止
- ⚠️ CI時間が伸びるとPRサイクルが遅くなる → 5分以内目標
- ❌ GitHub Actions の無料枠(月2,000分)を意識する必要

## 関連

- `docs/guides/ci-cd.md`
- `.github/workflows/ci.yml`
- `lefthook.yml`
