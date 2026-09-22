# 詳細アーキテクチャ

`docs/principles/architecture.md` の高レベル原則を、各レイヤーの具体設計に展開したドキュメント群。

## 構成

| ファイル | 内容 |
|---|---|
| [overview.md](./overview.md) | 全体像、リクエストの流れ、依存方向 |
| [frontend.md](./frontend.md) | React Server/Client 境界、UI構成、状態管理、フォーム |
| [backend.md](./backend.md) | Server Actions、Queries、DB、ジョブ、認可 |
| [shared.md](./shared.md) | 横断モジュール(Result型、Pagination、Env等) |
| [data-flow.md](./data-flow.md) | 主要シナリオのデータフロー詳細 |
| [error-handling.md](./error-handling.md) | エラー設計・伝播・UI表現 |
| [observability.md](./observability.md) | ログ・メトリクス・トレース |
| [security.md](./security.md) | 認証・認可・入力検証・秘密情報 |
| [performance.md](./performance.md) | キャッシュ・ストリーミング・最適化 |

## 関連

- 不変原則: [`docs/principles/`](../principles/)
- 過去判断: [`docs/adr/`](../adr/)
- 機能仕様: [`docs/features/`](../features/)
