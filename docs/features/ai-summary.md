# Feature: ai-summary(AI記事要約)

> 状態: **In Progress(骨格実装済み・LLM接続待ち)** — 2026-06-14。
> 本機能は ADR-0005 で MVP 除外・将来フェーズとされた「AI要約(3行サマリー)」の実装。
> 「本文取得して要約(全文は保存しない)」する方針は **ADR-0026(Accepted)** で確定。ADR-0005 の全文取得除外を部分 supersede する。
> 実装の前提条件: **LLM API キーの用意**(未設定。実物比較・実生成はキー入手後)。

## 実装状況(2026-06-14, キー不要部分)

LLM キー無しで進められる骨格を実装済み。`typecheck` / `depcruise`(ADR-0010 依存方向)/ `biome` / 単体テスト6件すべてグリーン。

- **DB**: `db/schema/article-summaries.ts` + マイグレーション `db/migrations/0007_article_summaries.sql` / `0008_fat_nicolaos.sql`(**生成のみ・未適用**)
- **domain**: `article-summary.ts`(エンティティ + `parseBullets` / `parseTags` の Zod 検証。`parseBullets` は「要点をまとめた要約です」等の中身のない定型行を検証前に除去し、全行該当なら failed=非表示にする)/ `article-summary-repository.ts` / `summary-generator.ts`(LLM Driven Port)/ `article-content-fetcher.ts`(本文取得 Port)
- **application**: `dto.ts` / `get-summary.ts` / `generate-summary.ts`(本文取得→生成→検証→upsert のオーケストレーション)+ `generate-summary.test.ts`(5ケース)
- **infrastructure**: `drizzle-article-summary-repository.ts`(upsert/findByArticleId/listPendingArticleIds)/ `llm-summary-generator.ts`(プロンプト整形 + lib/ai へ委譲。**二段構成 = 概要(overview, 1文)+ 補足の箇条書き(bullets) + タグ**。AI要約のベストプラクティス準拠: 本文のみ根拠で推測しない・第三者が客観的に解説・要約自体や一般論は書かない。概要は「です/ます」調の自然文で記事の性質に応じ結びを変える(紹介/解説/経験談/振り返り等。「〜内容です」固定や中身のない紹介は避ける)。箇条書きは概要を補う重複しない要点を**見出し(体言止め)+ 説明(です/ます調の具体的な1〜2文)**で。名詞の積み重ねを避け動詞を使い、文末を揃えない。文体・体裁は few-shot 出力例2件(技術の振り返り/イベント報告)で固定。タグは横断的な一般トピックを正式表記で0〜5個、表記ゆれ/上位下位重複を統一し、自社独自プロダクト名・イベント名・年号・分類一般語は使わない)/ `html-content-fetcher.ts`(素朴な本文抽出)
- **web**: `queries.ts`(`getSummaryByArticleId`, 'use cache: remote' + 記事タグ。ADR-0042)/ `web/components/summary-view.tsx`(**概要文 + 箇条書き + 関連タグ + AI生成ラベル**。デザインは**案A=ティール地コールアウト内に概要リード + チェックマーク箇条書き**で確定)
- **lib/ai**: `llm-client.ts`(ベンダー非依存 LLM クライアントのインターフェース + **未設定スタブ**。キー入手後にプロバイダ別アダプタを追加する seam)
- **feed 連携**: `article-dialog.tsx` に `summary?: ReactNode` スロットを追加(feed は ai-summary を import しない・構造のみ)

### キー入手後に必要な残作業

1. `lib/ai/llm-client.ts` にプロバイダ別アダプタ(Gemini / Claude)を実装し env で切替
2. サンプル20〜30記事で実出力比較 → 初期モデル確定
3. 取込バッチ(Trigger.dev タスク)から `generateSummary` を駆動(`listPendingArticleIds` で未要約のみ・Batches API)
4. 生成待ち/失敗/未生成記事の UI 方針を確定(現状はセクション非表示)
5. 本文抽出の強化(Readability 系)と **robots.txt 尊重**(現状は企業RSS既知ドメイン前提の最小実装)
6. マイグレーション適用(`bun run db:migrate`)
7. 生成待ち UI(準備中表示 or 非表示)/ バックフィル範囲の確定

## 概要

各記事の本文を取込時に取得し、LLM(Claude)で **3行の箇条書き要約** と **表示用の関連タグ** を事前生成する。ユーザーが記事カードを開いたときの記事ページ内に要約とタグを表示し、「外部リンクを踏む前に中身を把握できる」体験を提供する。

## ユーザーストーリー

- ソフトウェアエンジニアとして、記事を開く前に3行で要点を把握したい、なぜなら全部の記事をクリックして読む時間はないから
- ログインユーザーとして、自分に関係ある記事かを素早く判断したい、なぜならRSS抜粋だけでは内容が分からないことが多いから
- 未ログインユーザーとして、要約を見て読むかどうか決めたい、なぜなら外部サイトへ飛ぶ前に価値を判断したいから

## スコープ

### 含む(P0)

- 取込時バッチで全新着記事の本文を取得し、3行箇条書き要約を生成・永続化
- 要約と同じ生成結果として、表示用の関連タグを最大5件生成・永続化
- 記事ページ(`app/(app)/a/[id]/page.tsx`)内に要約セクションを表示
- 記事カードに表示用の関連タグを表示(要約 bullets はカードに出さず記事ページのみ)
- 要約は AI 生成であることの明示(ラベル + 出典は元記事)
- 生成失敗・本文取得失敗時のフォールバック(要約なしでも記事ページは成立する)

### 含まない(将来)

- フィードカード上での要約 bullets 表示 / 要約トグル(カードはタグのみ・bullets は記事ページ)
- ユーザーによるオンデマンド再生成・言語切替
- 要約の多言語化(初期は日本語固定)

## カテゴリ分類(ADR-0034)

保存済み要約(title + overview + tags)から LLM で7択を1つ選ぶ独立ステップ。

- **usecase**: `classify-pending-categories`(取込バッチ後段の別 cron で駆動)
- **実装**: `features/ai-summary/` 内に配置(ai-summary と同じ `article_summaries` テーブル行を対象)
- **定義**: `shared/categories.ts`(単一の真実の源。`CATEGORY_DEFINITIONS`、`SHELF_CATEGORIES`など)
- **入力**: `article_summaries.status='ready'` の記事のみ処理(本文再取得なし)
- **出力**: `article_summaries.category` / `categorized_at` カラム
- **失敗時**: `category=null` のまま `categorized_at` を記録し1日後に再試行(無限リトライ防止)
- **バッチサイズ**: `AI_CATEGORY_BATCH_LIMIT`(既定50・最大200)。バックフィルは上限を一時的に上げて同じ cron を回す
- **カテゴリ**: ai / infra / devex / app / security / org / event の7種(職能軸。ADR-0034)
  - `event` は棚ではなくページ下部のリスト表示(isShelf: false)
  - フィード画面では新着・棚・イベントの3セクションで表示(ADR-0035)

## 関連タグ表示の変更

ADR-0035 でカードのタグを AI バッジに置き換えたが、その後カードにタグを戻した(最大3件・1行・保存アクションと同じ行)。AI バッジは判定基準が機能していなかったため廃止した(経緯は `docs/features/feed.md` の「カード要素」参照)。タグの全件(最大5件)は記事ページの要約内に出す。

## 決定済み事項(要件定義 2026-06-14)

| 論点 | 決定 |
|---|---|
| 要約ソース | **本文を取得して要約**(RSS抜粋では精度不足。全文は保存せず一時利用) |
| 生成タイミング | **取込時にバッチ事前生成**(Trigger.dev の RSS 取得タスクに後続。表示は即時) |
| 表示箇所 | **要約 bullets は記事ページ内**。**関連タグは記事カード + 記事ページ**の両方に表示 |
| 要約フォーマット | **3行の箇条書き**(ADR-0005 の想定どおり) |
| 関連タグ | **表示用タグを最大5件**(検索/分類用途には使わない)。カードは先頭3件を1行表示、全件は記事ページ |

## 画面/UI

- 記事ページ(`app/(app)/a/[id]/page.tsx`)に「AI要約」セクションを追加。ヒーロー画像と RSS 抜粋の間、保存アクションより上。
- デスクトップ(`CenterDialog`)/ モバイル(`SheetDialog`)で共通の `DialogPanels` に差し込むため、両ブレークポイントで同時に出る。
- 記事プレビューページ `/a/[id]`(共有リンクの着地先)でも、ヒーロー画像の下に同じ `SummaryView` を描画する。さらに `meta description` と Article JSON-LD の `description` を要約 `overview` 優先にして、アグリゲータの薄い複製ページにならないよう独自テキストで価値を持たせる(ADR-0031)。`app/a/[id]/page.tsx` が `getSummaryByArticleId` で取得(app 合成層)。
- 要素:
  - 見出し: 「AI要約」+ AI生成バッジ(自動生成・元記事ではない旨)
  - 本体: 3つの箇条書き(各1行)
  - 関連タグ: 最大5件の小さなチップ(表示用。クリック検索やフィルタはしない)
  - 注記: 「元記事の内容を AI が要約したものです。正確性は保証されません」+ 元記事リンク導線(既存の「元記事を開く」を流用)

### 状態のバリエーション

- 要約あり(通常): 3行を表示
- 要約生成待ち(取込直後でまだバッチ未処理): 「要約を準備中」プレースホルダ or セクション非表示(下記「未決事項」)
- 本文取得失敗 / 生成失敗: 要約セクションを出さない(記事ページは RSS 抜粋で成立)
- 取込より前の既存記事(バックフィル前): 要約なし扱い

## データモデル

新テーブル `article_summaries`(記事 1:1。要約の有無・再生成・バージョンを記事本体から分離するため別テーブル)。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `article_id` | uuid FK → articles.id (UNIQUE, onDelete cascade) | 1記事1要約 |
| `overview` | text (nullable) | 記事全体を1文で表す概要(TL;DR)。列追加以前の既存行は NULL。domain で最大120字に制約 |
| `bullets` | jsonb (`{heading,detail}[]`) | 概要を補う箇条書き(見出し+説明)。件数は domain で 1〜3 に制約。旧データの `string[]` は Repository で吸収 |
| `tags` | jsonb (`string[]`) | 表示用の関連タグ。配列長は domain で 0〜5 に制約 |
| `model` | text | 生成に使ったモデル ID(例: `claude-haiku-4-5`)。再現性・移行用 |
| `source` | text | 要約の入力ソース(`full_text` / `rss_excerpt`)。フォールバック時の判別用 |
| `status` | text | `ready` / `failed`(失敗を記録して無限リトライを防ぐ) |
| `generated_at` | timestamptz | 生成時刻 |
| `created_at` / `updated_at` | timestamptz | 監査用 |

- **本文(full text)は保存しない**。取込時に一時取得 → 要約生成 → 破棄(著作権・ストレージ配慮)。
- インデックス: `article_summaries.article_id UNIQUE`(記事ページ表示時の単発参照キー)。
- 既存 `articles` テーブルは変更しない(要約有無は join / LEFT JOIN で解決)。

## API / Server Action

> 4層構成(ADR-0010)。新 feature `features/ai-summary/` を `bun run scaffold:feature ai-summary` で生成。
> feed は ai-summary を import しない(モジュール独立)。記事ページへの差し込みは app 層の composition で行う(保存アクションと同じパターン、ADR-0013)。

```ts
// features/ai-summary/web/queries.ts(RSC から呼ぶ)
getSummaryByArticleId(articleId: string): Promise<ArticleSummary | null>  // 'use cache: remote' + cacheTag(ADR-0042)。要約ありは cacheLife('days')、null(未生成/failed)は 'hours'(生成 cron の記事タグ無効化で即反映。ADR-0047)。記事ページ表示とカードのタグ表示の両方がこれを使う

// features/ai-summary/application(取込バッチから呼ぶ usecase)
generateSummary(input: { articleId, url, title, rssExcerpt }): Promise<Result<ArticleSummary, SummaryError>>
//   1. 本文取得(infrastructure: fetcher + 抽出)→ 失敗時は rss_excerpt にフォールバック
//   2. LLM 呼び出し(infrastructure: Claude クライアント)→ 3 bullets + display tags
//   3. Repository で upsert(status=ready / failed)
```

- バッチ呼び出し口: Trigger.dev タスク(RSS 取込 `fetch-feed-articles` の後続、または専用 `summarize-new-articles`)。`jobs/` 配下。新着 upsert された記事 ID を入力に、未要約(`article_summaries` 不在 or status=failed の再試行対象)だけ処理。
- LLM クライアントは `lib/`(横断 infrastructure)に置き、sink/usecase へ注入(`lib/` は `features/` を import しない原則を維持)。
- カードのタグは専用クエリを足さず、app 合成層(`getFeedPageData`)が先取得して `ComposedArticle.summary` に載せた要約の `tags` を再利用する(要約の先取得はカードのちらつき解消で既に導入済み)。タグ無し(要約なし / 未生成)はカードでチップ行ごと非表示。

## ビジネスルール

- 認可: 要約は記事と同じ公開度(未ログインでも閲覧可。記事が公開なら要約も公開)。`getSummaryByArticleId` に認証要件なし。
- 入力上限: 本文は先頭 N トークン(例: 8k 相当)で打ち切ってからプロンプトへ(コスト上限)。
- 出力検証: LLM 応答は Zod で「bullets は string[] 長さ 1〜3・各行 N 文字以内」「tags は string[] 長さ 0〜5・各タグ N 文字以内」を検証。逸脱時は status=failed。
- タグの扱い: `tags` は表示補助(記事カード + 記事ページ)。正規化タグ基盤は持たないが、サイドバーの固定キュレーションからのフィード絞り込み(`?tag=` 完全一致)にだけ流用する(ADR-0027)。表記ゆれは取りこぼす前提で、検索の主経路は引き続き全文検索 `?q=`(ADR-0022)。
- 言語: 出力は日本語固定(初期)。
- べき等性: `article_id` UNIQUE + upsert。再実行で重複生成しない。`status=ready` は再生成しない(モデル更新時の明示再生成は将来)。
- 失敗の扱い: 本文取得失敗 → rss_excerpt にフォールバックして生成(`source=rss_excerpt`)。それも失敗 → `status=failed` 記録、記事ページでは非表示。
- robots.txt / ToS: 本文取得は robots.txt を尊重し、不許可ドメインは rss_excerpt フォールバックのみ(下記未決事項)。
- 削除: 記事削除(物理)で cascade。記事の論理削除(`deleted_at`)時は要約も表示しない。
- キャッシュ: `getSummaryByArticleId` は `'use cache'` + 記事単位タグ。生成バッチ完了時に該当タグを `updateTag`。

## エッジケース

- 本文が極端に短い/取得できない → rss_excerpt フォールバック、なお不足なら failed
- LLM がハルシネーション/フォーマット逸脱 → Zod 検証で弾き failed(壊れた要約を出さない)
- 同一記事への並行バッチ → UNIQUE + upsert で収束
- 取込直後でバッチ未処理 → 要約なし状態の UI(プレースホルダ方針は未決)
- コスト急増(大量新着) → バッチに件数/レート上限、優先度(人気記事優先)は将来

## メトリクス

- 要約生成成功率 / フォールバック率 / 失敗率
- 要約セクションの表示回数・展開率(PostHog)
- 要約あり記事の「元記事を開く」クリック率 vs 要約なし記事(価値検証)
- LLM トークン消費・コスト(モデル別)
- 平均生成レイテンシ(取込→要約 ready までの遅延)

## 未決事項(実装前に確定が必要)

1. ~~**新 ADR**: 全文取得除外を部分 supersede する ADR~~ → **ADR-0026 で確定済み(Accepted)**。要約ソースは「本文を取込時に一時取得・全文非保存」。
2. **モデル選定**: 実測ボリューム(総892件・272件/月)ではコストはどのモデルでも誤差(月額 最大でも数百円・バックフィル1回 ¥500〜)。料金ではなく日本語3行要約の品質で選ぶ。**プロバイダ非依存ポート + 最安ティア(Gemini Flash-Lite 系 もしくは `claude-haiku-4-5`)起点**とし、サンプル20〜30記事の実出力比較で確定(ADR-0026)。**実物比較には LLM API キーが未設定のため、キー入手が前提**。
3. **本文抽出方式**: HTML から本文抽出(Readability 系 vs 自前)。取得失敗ドメインの扱い。
4. **生成待ちの UI**: バッチ未処理記事でセクションを「準備中」表示するか、単に非表示にするか。
5. **バックフィル**: 既存記事への遡及生成をやるか(件数とコスト見積もり)。
6. **専用バッチ vs 取込タスク内**: `fetch-feed-articles` に内包するか独立タスクにするか(失敗分離・リトライの観点で独立を推奨)。

## 関連

- ADR-0034 (記事カテゴリの定義と分類)
- ADR-0035 (セクション型フィード。カテゴリ分類の結果を棚表示に利用)
- ADR-0005(MVP除外: AI要約 — 本機能で将来フェーズを着手。全文取得除外を新 ADR で部分 supersede)
- ADR-0026(AI要約は本文を取込時に一時取得・全文非保存)
- ADR-0010(feature 4層構成 — 新 feature `ai-summary` を同構成で)
- ADR-0013(app 層での composition — feed は ai-summary を import しない)
- ADR-0016(ユーザー/記事単位キャッシュと updateTag)
- 機能: feed(記事ページに要約を差し込む先。セクション型フィード対応)
