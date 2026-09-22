# ADR-0019: 既定フィードの静的プリレンダでローディングを消す

- **状態**: Superseded by ADR-0024(記事フィードのフォールバックのみ。ツールバーの既定プリレンダは ADR-0024 でも維持)
- **決定日**: 2026-06-07
- **関連**: ADR-0013 (オフセット + フィードキャッシュ), ADR-0016 (ユーザー単位キャッシュ + 再マウント回避), ADR-0012 (購読初期化), ADR-0024 (本 ADR を supersede)

> ⚠️ **Superseded**: 本 ADR で導入した「動的フィードのフォールバックに既定フィードの実コンテンツ(`DefaultFeed`)を置く」設計は、リロード時に「古い記事 → 新しい記事」の内容差し替えが体感ノイズになったため、記事フィードについては `FeedGridSkeleton` フォールバックへ戻した。詳細は ADR-0024。ツールバー(`DefaultToolbar` / `DefaultFeedControls`)の既定プリレンダは内容差し替えが起きないため維持する。

## 背景

トップ `/` は初回ロード・リロードのたびに `FeedGridSkeleton` が出ていた。
原因は `app/page.tsx` の `SubscribedFeed` が **`searchParams`(動的API)・`getSession()`(cookie)・
`pageSize()`(headers)** を読むため、`cacheComponents`(PPR)下でこの Suspense 境界が常に
「動的 hole」になり、フォールバック(スケルトン)を経由してからストリームされること。

ADR-0016 の計測で「DB は 7.3ms・データは全キャッシュヒット・再マウントも解消済み」だったので、
残る体感ロスは **この初回スケルトン** に集約されていた。

## 検討した選択肢

### A. クライアント駆動へ全面移行
初期を空シェルでプリレンダし、マウント後に Server Action でフィードを取得して差し替える。
→ 初回 paint で結局ローディング状態が出る(スケルトンを別名にしただけ)。SEO も弱る。却下。

### B. 既定フィードを実コンテンツとしてプリレンダ(採用)
`searchParams`/cookie/headers を読まない純キャッシュ RSC `DefaultFeed`(最新・全社・1ページ目)を
**動的 `SubscribedFeed` の Suspense フォールバック**に置く。PPR が静的シェルに焼き込むため、
初回は **スケルトンを挟まず実コンテンツが即表示**される。動的な `SubscribedFeed` が解決したら
個人化/フィルタ結果でストリーム上書きする。

- ADR-0012 で新規ユーザーは全企業購読がデフォルト → 「全社の既定フィード」は大半のログインユーザーの
  購読フィードと一致し、上書き時のチラつきは実質ほぼ無い(購読を絞った人だけ内容更新が入る)。
- sort/period/company の切替は **ADR-0016 のまま**(URL 駆動 + `startTransition` + prefetch)。
  遷移中は旧コンテンツを保持するのでフォールバック(=既定フィード)には戻らない。当初プランで検討した
  「フィルタの Server Action 化」は不要だった(切替は元からスケルトンを出さない)。

## 決定

**B** を採用。

- `features/feed/web/queries.ts` に `getDefaultFeed()` を追加。最新・全社・1ページ目を `'use cache'`
  (`feed` タグ / `cacheLife('minutes')`)で返す。**throw する `getFeed` と違い、失敗時は `null` を返す**:
  DB 非到達のビルド(CI 等)でも `getFeed` のように reject せず resolve させることで、Next が
  「キャッシュ関数の reject」をビルドエラーとして扱うのを防ぐ。これで ADR-0016 の
  「ビルド時に DB 接続を要しない」制約を維持する。DB 到達可能な本番ビルドでは実データを返す。
  - 失敗捕捉は **このキャッシュ関数の内側**で行う。throw する `getFeed` をネストすると内側 reject が
    再び致命化するため、`listFeed`/Repository を直接呼ぶ。
- `app/page.tsx` の `SubscribedFeed` のフォールバックを `FeedGridSkeleton` から `DefaultFeed` に変更。
  `DefaultFeed` は `getDefaultFeed()` が `null`(DB 非到達ビルド)を返したときだけ `FeedGridSkeleton` に退避。
- **`new Date()` のプリレンダ禁止対応**: `ArticleCard`(client)が相対時刻を `formatRelative(new Date())` で
  描画していたため、プリレンダ中の現在時刻参照で `next-prerender-current-time` ビルドエラーになった。
  `RelativeTime`(`features/feed/web/components/relative-time.tsx`)に切り出し、初期は現在時刻に依存しない
  絶対日付、マウント後(`useEffect`)に相対表記へ差し替える。
- `pageSize()` の headers 依存は ADR(本変更と同 PR)で定数化済み(getFeedPageData の動的依存を削減)。

## 結果

- ✅ 初回ロード・リロードで **スケルトンが出ず実コンテンツが即表示**(本番ビルドで `/index.html` に
  12枚のカードが焼き込まれ skeleton 0 を確認。`next start` でも 200 + skeleton 0 を確認)。
- ✅ `/` は `◐ Partial Prerender`(Revalidate 1m / Expire 1h)。静的シェル + 動的ストリーム。
- ✅ DB 非到達のビルド(CI 等)でもビルドが通る(`getDefaultFeed` が `null` → スケルトン退避)。
  → ADR-0016 の「ビルド時に DB を要しない」制約を維持。
- ✅ sort/period/company 切替は ADR-0016 のまま(スケルトンに戻らず内容差し替え)。
- ⚠️ 既定フィードは全社・最新で固定。購読を絞ったログインユーザーは初回に「全社→購読」の内容差し替えが
  一度入る(スケルトンではなく内容更新として見える)。ADR-0012 の購読デフォルト=全社で大半は不可視。
- ⚠️ プリレンダされた既定フィードは `cacheLife('minutes')` の範囲で stale になりうる。実表示は動的
  `SubscribedFeed` のストリームが最新で上書きするため、ユーザーが見る最終結果には影響しない。
- ⚠️ 相対時刻は SSR/プリレンダで絶対日付 → マウント後に相対表記へ切替(意図的。
  `suppressHydrationWarning` 済み)。

## 関連リソース

- `features/feed/web/queries.ts`(`getDefaultFeed`)
- `app/page.tsx`(`DefaultFeed` フォールバック)
- `features/feed/web/components/relative-time.tsx`
- `components/article/feed-load-more.tsx`(`INITIAL_PAGE_SIZE` 定数化)
