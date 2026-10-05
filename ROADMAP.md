# Techblo ロードマップ

機能(FEATURES.md)を依存関係順に並べ、**各マイルストーンの終わりに必ずデプロイ可能な状態**になるよう縦切りで構成。個人開発前提なので、期間ではなく「作業のまとまり」で区切る。

開始: 2026-05-29(scaffold 完了時点)

---

## 全体像

```
M0 基盤              ✅ 完了(scaffold / CI / docs / data model)
   ↓
M1 データ取り込み     RSS pipeline → 記事がDBに溜まる
   ↓
M2 公開フィード MVP   未ログインで読める・デプロイ(最初の "動くもの")
   ↓
M3 認証              Google ログイン
   ↓
M4 個人化            購読設定 / ブックマーク / お気に入り
   ↓
M5 発見性            人気順 / 未読 / クリック集計
   ↓
M6 仕上げ            観測強化 / E2E / 本番運用
```

各 M は独立した PR 群。M2 完了時点で「公開 Web サービスとして人に見せられる」状態になるのが狙い。

---

## M0: 基盤(✅ 完了)

- [x] 要件・機能・アーキテクチャ・技術スタック確定
- [x] Next.js 16 + Drizzle + Better Auth scaffold
- [x] CI / pre-commit hooks / AI ハーネス
- [x] データモデル(7テーブル + migration)
- [x] dev tooling 最新化

---

## M1: データ取り込み(RSS パイプライン)

**ゴール**: 6社のRSSを取得し、記事が `articles` テーブルに溜まる。表示UIはまだ無くてよい(Drizzle Studio で確認)。

| タスク | 関連 |
|---|---|
| `scripts/seed.ts` で6社を `companies` に投入 | docs/guides/adding-a-company.md |
| `lib/rss/parser.ts` — XML → Zod 検証 → ArticleInput | docs/architecture/backend.md |
| `lib/rss/fetcher.ts` — retry/timeout 付き取得 | lib/http/fetcher.ts |
| `lib/ogp/extractor.ts` — description/og:image 補完 | ADR-0004 |
| `jobs/refresh-company-feed.ts` — 1社取得 → upsert | Trigger.dev |
| `jobs/fetch-all-feeds.ts` — 毎時 cron で fan-out | |
| パーサーの unit test(各社RSSのfixture) | docs/principles/testing.md |

**完了条件**: `bun run db:seed` → ジョブ手動実行 → Drizzle Studio に各社の記事が並ぶ。

---

## M2: 公開フィード MVP(最初のデプロイ)🎯

**ゴール**: 未ログインで全6社の記事を新着順カードで閲覧でき、Vercel にデプロイ済み。**ここが最初の公開マイルストーン**。

| タスク | 機能(FEATURES) |
|---|---|
| `features/feed/types.ts` — ArticleCard schema | feed |
| `features/feed/queries.ts` — getArticles(新着順) | feed P0 |
| `features/feed/components/article-card.tsx` — mockup.html をReact化 | feed P0 |
| OGP画像表示 + プレースホルダー fallback(`/api/og/[id]`) | feed P0, ADR-0004 |
| 企業ブランドカラーのカード装飾 | feed P0 |
| レスポンシブ(モバイル下部ナビ含む) | 非機能 P0 |
| トップページの PPR + Suspense skeleton | docs/architecture/performance.md |
| Vercel + Neon 本番接続、初回デプロイ | docs/guides/ci-cd.md |

**完了条件**: 本番URLで誰でも記事一覧が見られる。

---

## M3: 認証(Google OAuth)

**ゴール**: Google でログイン/ログアウトできる。まだ個人化機能は無くてよい。

| タスク | 機能 |
|---|---|
| `lib/auth.ts` — Better Auth + Google provider | auth |
| `app/api/auth/[...all]/route.ts` | auth |
| `features/auth/server.ts` — getSession / requireSession | auth |
| `features/auth/components/login-button.tsx` + アバターメニュー | auth |
| `components/shared/login-modal.tsx`(個人化操作の誘導用) | auth |
| `middleware.ts` — `/(auth)/*` のガード | docs/architecture/backend.md |
| 初回ログイン時の subscriptions 初期化ジョブ | subscriptions |

**完了条件**: ログイン状態がヘッダーに反映され、再訪問でも維持される。

---

## M4: 個人化(購読・ブックマーク・お気に入り)

**ゴール**: ログインユーザーが購読企業を絞り込み、記事をブックマーク/お気に入りできる。

| タスク | 機能 |
|---|---|
| `features/subscriptions/` — 一覧 + トグル + 設定画面 | subscriptions P1 |
| フィードに購読フィルタ適用(ログイン時) | feed × subscriptions |
| `features/bookmarks/` — toggle + 一覧画面 + useOptimistic | bookmarks P1 |
| `features/favorites/` — 同上 | favorites P1 |
| `app/(auth)/settings` `/bookmarks` `/favorites` ページ | 画面 S2/S3/S4 |
| 空状態UI(ブックマーク無し等) | 各画面 state |
| 各 actions の integration test(Neon branch) | testing |

**完了条件**: 3シナリオ(キャッチアップ/深掘り/カスタマイズ)が一通り回る。

---

## M5: 発見性(人気順・未読・集計)

**ゴール**: 人気順ソートと未読管理で「読む体験」を高める。

| タスク | 機能 |
|---|---|
| `features/feed/actions.ts` — trackArticleView(クリック集計) | feed P2 |
| 人気順クエリ(view+bookmark+favorite スコア) | feed P2 |
| 未読インジケータ + 既読管理 | feed P2 |
| カウンター再計算の夜次バッチ(ズレ補正) | ADR-0009 |
| サイドバー/タブの並び替えUI | feed |

**完了条件**: 新着順/人気順を切り替えられ、未読が一目で分かる。

---

## M6: 仕上げ(観測・テスト・運用)

**ゴール**: 公開運用に耐える品質。

| タスク | 関連 |
|---|---|
| Sentry / PostHog 本接続 + 主要イベント計測 | docs/architecture/observability.md |
| E2E(ログイン→ブックマーク→購読変更) | docs/principles/testing.md |
| Web Vitals 計測 + パフォーマンス調整 | performance.md |
| RSS取得失敗のアラート(連続失敗検知) | observability.md |
| ヘルスチェック + uptime monitor | observability.md |
| README / OGP / favicon 等の体裁 | — |

**完了条件**: 監視が効き、主要シナリオが E2E で守られている。

---

## 将来(MVP後、優先度順)

1. **AI要約**(3行サマリー)— ブランド名 "techy" の本領。Vercel AI SDK + Claude(ADR-0005 / task#4)
2. **海外AI企業対応**(Anthropic / OpenAI)— スクレイピング or RSSHub(task#5)
3. タグ/カテゴリ自動分類(LLM)
4. 全文検索
5. 新着通知(メール/Webプッシュ)
6. ダークモード — **実装済み**(ADR-0038)。next-themes + `.dark` でのトークン上書き。設定画面の「表示」でシステム / ライト / ダークを選択
7. 共有用の個別記事ページ
8. 過去記事のバックフィル — RSSは最新N件しか返さないため、継続運用で新着は溜まるが過去記事は埋まらない。各社のページネーションRSS(`?paged=N`)やsitemapから一括取得する仕組みを検討

---

## マイルストーンと機能優先度の対応

| マイルストーン | FEATURES の優先度 |
|---|---|
| M1, M2 | P0(コア・公開閲覧) |
| M3, M4 | P1(認証・個人化) |
| M5 | P2(発見性) |
| M6 | 非機能 |
| 将来 | FUTURE |

## 進め方の原則

- **1マイルストーン = デプロイ可能な縦切り**。横に全部作ってから繋ぐ、はやらない
- 各機能は `docs/guides/adding-a-feature.md` の手順に沿う
- マイルストーン完了ごとに本番デプロイして実物で確認
- スコープが膨らんだら ADR-0005(MVP除外)に立ち返る
