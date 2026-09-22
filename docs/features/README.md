# 機能仕様

各機能の詳細仕様を `features/` 配下に1ファイルずつ配置。実装時に細部を書き足していく。

## 機能マップ

```
┌────────────────────────────────────────────┐
│ feed          ─ 記事一覧(全ユーザー向け) │
│ subscriptions ─ 購読企業設定               │
│ bookmarks     ─ 後で読む                   │
│ favorites     ─ お気に入り                 │
│ auth          ─ Google OAuth ログイン      │
└────────────────────────────────────────────┘
```

## 機能間の関係

```
auth (ログイン) ──┬→ subscriptions (購読企業のON/OFF)
                  ├→ bookmarks (ブックマーク追加)
                  └→ favorites (お気に入り追加)
                              ↓
                  すべて feed の表示に影響を与える
```

## 仕様書一覧

| 機能 | 状態 | パス |
|---|---|---|
| 記事フィード | Draft | [feed.md](./feed.md) |
| 認証 | Draft | [auth.md](./auth.md) |
| ブックマーク | Draft | [bookmarks.md](./bookmarks.md) |
| お気に入り | Draft | [favorites.md](./favorites.md) |
| 購読企業設定 | Draft | [subscriptions.md](./subscriptions.md) |
| マイフィード(ユーザー登録RSS) | Draft | [user-feeds.md](./user-feeds.md) |
| AI記事要約 | In Progress(骨格) | [ai-summary.md](./ai-summary.md) |

## 仕様書のテンプレート

各機能の仕様書は以下の構成で書く:

```md
# {機能名}

## 概要
1-2文で機能を説明。

## ユーザーストーリー
- {ペルソナ}として、{したいこと}したい、なぜなら{理由}

## 画面/UI
- 配置場所、状態のバリエーション

## データモデル
- 関連するテーブル/カラム

## API/Server Action
- features/{name}/queries.ts と actions.ts のシグネチャ

## ビジネスルール
- 認可ルール(policies)
- バリデーション
- 制約事項

## エッジケース
- エラー時の振る舞い
- 空状態の振る舞い

## メトリクス
- 計測したい指標

## 関連
- 関連ADR、関連機能
```
