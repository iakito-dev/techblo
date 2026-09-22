# ADR-0022: 記事検索は ILIKE + pg_trgm、結果はフィードキャッシュをバイパス

- **状態**: Accepted
- **決定日**: 2026-06-10
- **関連**: ADR-0005(MVP除外), ADR-0013(オフセットページネーション + フィードキャッシュ), ADR-0016(user-scoped cache), ADR-0019(静的プリレンダ), ADR-0021(既読フィルタ)

## 背景

MVP で除外していた記事検索(ADR-0005)を実装する。要件は:

- 検索対象は `articles.title` + `articles.description`(RSS抜粋)。**本文は DB に保存していない**ため対象外
- UX はフィード絞り込み型: トップバーの検索欄(従来はプレースホルダ)に入力すると `?q=` が URL に反映され、既存の `?company` / `?sort` / `?read` と同じ URL-first パターンでフィードが絞られる
- 日本語の検索語が主(日本企業のテックブログ)。データ規模は小(6社・数千記事)

決めるべきことは2つ: (1) DB 側の検索方式、(2) 検索結果と既存フィードキャッシュ(`'use cache'` + `cacheTag('feed')` + `'days'` + イベント駆動無効化)の関係。

## 検討した選択肢

### 検索方式

#### A. PostgreSQL FTS(tsvector + GIN)

- 標準の全文検索。英語等は語幹処理・ランキングが強力
- ❌ 既定の text search configuration は**日本語をトークナイズできない**(分かち書きがないため tsvector が文単位の塊になる)。日本語対応には MeCab 連携(textsearch_ja)等が必要で Neon では使えない

#### B. ILIKE 部分一致 + pg_trgm GIN インデックス

- `title ILIKE '%q%' OR description ILIKE '%q%'`。pg_trgm の `gin_trgm_ops` が ILIKE をインデックスサポートする
- pg_trgm は UTF-8 マルチバイトからトライグラムを抽出するため**日本語の部分一致にそのまま効く**。Neon で `CREATE EXTENSION pg_trgm` 可
- 2文字以下の検索語はトライグラムが効かず seq scan に落ちるが、この規模では実害なし
- LIKE メタ文字(`% _ \`)はエスケープ必須(infrastructure 層の `escapeLike`)

#### C. 外部検索エンジン(Meilisearch / Algolia / Typesense)

- 日本語トークナイズ・typo 耐性・ランキングは最良
- ❌ 同期パイプライン・運用・コストが増える。数千記事の部分一致には過剰

### キャッシュ

#### D. `getFeed` に q を含めてそのままキャッシュ

- 実装は最小
- ❌ `q` はバリアント基数が**非有界**(ユーザー数 × 語彙)。現行の「`'days'` + イベント駆動無効化」は sort×period×company×page の少数有界バリアントが前提で、q を混ぜるとキャッシュストア肥大と `revalidateTag('feed')` の無効化コスト増を招く

#### E. 検索専用の非キャッシュ関数(searchFeed)

- `'use cache'` を付けない `searchFeed` を queries.ts に追加し、`?q=` ありのときだけ通す
- 検索は能動操作で、trgm インデックスがあるため都度の Neon 往復(実測 130ms〜)は許容範囲
- 既読フィルタも `readFilter` 引数で受けて1クエリで完結(per-user タグ配管が不要)

## 決定

**B(ILIKE + pg_trgm)+ E(検索はキャッシュバイパス)**。

`gin_trgm_ops` は drizzle-kit のスキーマ定義で表現できないため、カスタムマイグレーション
`db/migrations/0004_article_search_trgm.sql` で `CREATE EXTENSION pg_trgm` と
title/description の GIN インデックスを張る。

検索語の正規化(trim・100文字上限・空→undefined)は application 層(`list-feed.ts`)、
LIKE エスケープは infrastructure 層(`escape-like.ts`)の責務。

## 結果

- ✅ 既存データ・既存スキーマのまま日本語検索が動く(本文取り込み・外部サービス不要)
- ✅ 既存フィルタ(企業/既読/期間)と WHERE の AND 結合で自然に併用できる
- ✅ ゲスト共通フィードのキャッシュ戦略(ADR-0013/0016)を汚さない
- ⚠️ 検索リクエストは毎回 Neon に到達する。検索が高頻度になったら短命キャッシュ等を再検討
- ⚠️ 入力側で debounce(300ms)+ IME 変換中の commit 抑止を行い、キーストロークごとの往復を防ぐ(`use-feed-search.ts` / `feed-search-box.tsx`)
- ❌ 関連度ランキングは無し(並びは既存の新着/人気のまま)。形態素レベルの一致(「東京都」で「京都」がヒットしない等)も保証しない — 部分一致の素朴な挙動を受け入れる

## 関連リソース

- [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- docs/features/feed.md(検索の仕様)
