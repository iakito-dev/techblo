# GitHub Copilot Instructions

このプロジェクトの指示はルートの `AGENTS.md` に集約されています。

**必ず以下を順に参照してください:**

1. [`AGENTS.md`](../AGENTS.md) — 全AIエージェント共通の指示
2. [`docs/README.md`](../docs/README.md) — ドキュメント索引
3. 該当機能の [`docs/features/`](../docs/features/) と [`docs/adr/`](../docs/adr/)

## 要点抜粋(Copilot向け)

- TypeScript strict、`any` 禁止、Zodで型を派生
- ファイル名 kebab-case、コンポーネント PascalCase
- features/A から features/B を import しない
- db/ を app/ から直接 import しない
- throw せず `Result<T, E>` を返す
- コメントは Why のみ

詳細は `AGENTS.md` 参照。
