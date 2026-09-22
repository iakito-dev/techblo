# ADR-0024: 記事フィードのフォールバックを skeleton に戻す

- **状態**: Accepted
- **決定日**: 2026-06-12
- **関連**: ADR-0019 (本 ADR が supersede), ADR-0016 (ユーザー単位キャッシュ + 再マウント回避), ADR-0012 (購読初期化)

## 背景

ADR-0019 で、トップ `/` の初回ロード・リロード時のスケルトンを消すため、動的な `SubscribedFeed`
(購読・並び順・フィルタ・最新DB を反映)の Suspense フォールバックに、静的プリレンダ可能な
既定フィード `DefaultFeed`(最新・全社・1ページ目・保存状態なし)の**実コンテンツ**を置いていた。
PPR が静的シェルに `DefaultFeed` を焼き込むため、リロード直後からスケルトンを挟まず記事が見える。

ADR-0019 自身が downside として「購読を絞った/並び順を変えたユーザーは初回に内容差し替えが一度入る」
「プリレンダは stale になりうる」と記録していたが、「ADR-0012 の購読デフォルト=全社で大半は不可視」と
見積もっていた。

実運用でこの見積もりが外れた。リロードのたびに **「古い記事が一瞬表示され、数秒後に新しい記事へ
切り替わる」** 挙動が体感ノイズとして報告された。要因は2つ:

- **ビュー不一致**: `DefaultFeed` は常に「最新・全社・1ページ目・保存状態なし・ゲスト扱い」で固定。
  購読を絞った/人気順や期間/企業フィルタを使う/ログイン済みのユーザーでは、ストリームで解決した
  `SubscribedFeed` の内容と差があり、差し替えが可視化する。
- **鮮度のずれ**: `getDefaultFeed` は実装上 `cacheLife('days')`(ADR-0019 本文の `'minutes'` 記載とは
  乖離していた)。鮮度は cron→`/api/revalidate` のイベント駆動無効化任せのため、プリレンダされた
  既定フィードが最大で数日 stale になり「古い記事」として見えうる。

skeleton → 実コンテンツの遷移は「読み込み中」と認識されるが、実コンテンツ → 実コンテンツの差し替えは
「画面が勝手に書き換わった」と認識され、UX 上はこちらの方が悪い。

## 検討した選択肢

### A. 記事フィードのフォールバックを `FeedGridSkeleton` に戻す(採用)
`SubscribedFeed` の Suspense フォールバックを `DefaultFeed` → `FeedGridSkeleton` に戻す。
ADR-0019 以前の挙動に戻すが、`FeedGridSkeleton` も PPR の静的シェルに焼き込まれるため、リロード時の
初期フラッシュは即座(force-dynamic 化はしない)。内容差し替えは全ケースで消え、リロード時に出るのは
ストリーム解決までの短い skeleton のみ。

### B. 既定フィードの鮮度だけ改善(却下)
`DefaultFeed` を維持しつつ revalidate を短縮・取込時の無効化を確実にする。鮮度のずれは縮むが、
**ビュー不一致**(購読を絞った/並び順を変えたユーザー)の差し替えは残るため、報告された問題を
根治できない。

### C. リクエスト内容に応じてフォールバックを出し分け(却下)
既定ビュー(searchParams なし・全社購読)のときだけ `DefaultFeed`、それ以外は skeleton。
だがフォールバックは静的シェル側に焼かれるため、`searchParams`/セッションを読んで出し分けることが
できない(それを読めば動的化して PPR の即フラッシュ自体が失われる)。実装不可。

## 決定

**A** を採用。記事フィードについては ADR-0019 を supersede し、`FeedGridSkeleton` フォールバックへ戻す。

- `app/(app)/page.tsx`: `<Suspense fallback={<DefaultFeed />}>` → `<Suspense fallback={<FeedGridSkeleton />}>`。
  不要になった `DefaultFeed` 関数と `ComposedArticle` / `getDefaultFeed` の import を削除。
- `features/feed/web/queries.ts`: orphan になった `getDefaultFeed()` を削除。
- **ツールバーの既定プリレンダは維持**: `DefaultToolbar` / `DefaultFeedControls`(`getDefaultFilterCompanies`)は
  据え置く。ツールバーは並び替えタブが即表示される利点があり、記事カードのような「内容差し替え」が
  起きない(企業フィルタのチップが購読スコープで変わる程度で、体感ノイズにならない)ため。

### 副次: 投稿日時の「絶対日付 → 相対表記」ちらつきも解消

ADR-0019 は `RelativeTime`(`features/feed/web/components/relative-time.tsx`)を「初期=絶対日付 →
マウント後(`useEffect`)=相対表記」に差し替える設計にしていた。理由は、静的プリレンダ(`DefaultFeed`)中に
相対表記が依存する `new Date()` を読むと `next-prerender-current-time` ビルドエラーになるため。

本 ADR で `DefaultFeed` を削除した結果、記事カード(`ArticleCard` → `RelativeTime`)を描画する経路は
動的レンダリングのみ(トップの `SubscribedFeed`、ユーザー固有の bookmarks/favorites、client の
saved-articles-view)になり、**静的プリレンダ経路が消えた**。よって相対表記をサーバーHTMLに直接焼ける。

- `RelativeTime` から `useState`/`useEffect` の差し替えを撤去し、初期から `formatRelative(date)` を描画。
  サーバー(動的SSR)が「3時間前」を HTML に焼き、リロード直後の「日付 → 相対表記」ちらつきが消える。
- now() のサーバー/クライアント差は粒度が粗くほぼ同一文字列。境界差分は `suppressHydrationWarning` で
  抑える(差し替えはせずサーバー値を維持)。
- ⚠️ **制約**: 今後 `ArticleCard` / `RelativeTime` を静的プリレンダ経路(`'use cache'` ページや
  PPR 静的シェル)に置くと `next-prerender-current-time` が再発する。その場合は表示専用に
  絶対日付フォールバックを併用するなどの対応が必要。

## 結果

- ✅ リロード時の「古い記事 → 新しい記事」の内容差し替えが消える。出るのはストリーム解決までの skeleton のみ。
- ✅ PPR の静的シェルに skeleton が焼き込まれるため、リロード時の初期フラッシュは即座(force-dynamic 化しない)。
- ✅ 並び替え・フィルタ・企業ツールバーはフォールバック(`DefaultToolbar`)で即表示される(据え置き)。
- ⚠️ ADR-0019 が消した「初回のスケルトン」は記事フィードに復活する。ただし内容差し替えより望ましいと判断。
- ⚠️ `getDefaultFeed` の削除で「既定フィードをウォームに保つ」プリレンダ専用キャッシュは無くなる。
  通常のフィード取得は引き続き `getFeed`('use cache' / `cacheLife('days')` / イベント駆動無効化)を使う。

## 関連リソース

- `app/(app)/page.tsx`(`SubscribedFeed` のフォールバック)
- `features/feed/web/queries.ts`
- `features/feed/web/components/feed-grid.tsx`(`FeedGridSkeleton`)
- ADR-0019(本 ADR が supersede)
