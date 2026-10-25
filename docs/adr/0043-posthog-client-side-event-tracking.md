# ADR-0043: PostHog の行動計測はクライアントの明示イベントだけで行い、個人情報は送らない

- **状態**: Accepted
- **決定日**: 2026-10-24
- **関連**: ADR-0010, ADR-0017, ADR-0042

## 背景

本番の訪問は週ごとに伸びているが、Vercel Analytics ではどの記事が読まれているか、ログインのどこで
離脱しているか、再訪しているかがわからない。`posthog-js` は依存に入っていたがコードからは未使用で、
observability.md のイベント設計も未実装だった。導入にあたり次を決める必要があった。

- どこから送るか(クライアント / Server Action / 両方)
- autocapture・セッション録画をどうするか(画面にはメールアドレスが表示される)
- キーをクライアントへどう渡すか(`lib/env` は zod 依存。ADR-0042 で zod をクライアントから外した)
- OAuth のリダイレクトをまたぐ「認証完了」をどう取るか

## 検討した選択肢

### A. クライアントの posthog-js だけで明示イベントを送る(採用)

- Server Action の結果をクライアントが受け取り、`ok` のときに capture する
- メリット: 依存追加なし。ゲスト(localStorage / Cookie 保存)の操作もログイン時と同じ経路で数えられる。
  distinct_id が pageview と同じなのでファネル・リテンションがそのまま組める
- デメリット: 広告ブロッカーで落ちる分は数えられない

### B. Server Action から posthog-node で送る

- メリット: ブロッカーの影響を受けない
- デメリット: ゲスト操作はサーバーを通らないので別経路が要る。クライアントの匿名 distinct_id を
  サーバーへ渡す仕組みが要る。サーバーレスでは送信の flush 待ちがレスポンスを遅らせる

### C. autocapture + セッション録画に任せる

- メリット: 実装がほぼ不要
- デメリット: クリック要素のテキスト(`$el_text`)にユーザーメニューのメールアドレスが載る。
  録画にも写る。イベント名が安定せず、ダッシュボードが UI の文言変更で壊れる

## 決定

A を採用する。

- `lib/observability/posthog.ts` に init / `captureEvent` / `identifyUser` / `resetUser` とイベント型
  (`AnalyticsEvents`)を置く。キー未設定なら init せず、以降はすべて no-op
- autocapture / rageclick / dead click / セッション録画は無効。`identify` はユーザー id のみ
- pageview は `capture_pageview: 'history_change'` で App Router の遷移も取る
- キーは RootLayout(サーバー)が `lib/env` から読み、`Providers` に props で渡す。client で `lib/env`
  を import しない(zod をクライアントバンドルに戻さない)
- init は Provider の描画中に行う(effect は子から先に走るため、effect で init すると子の初回の
  capture / identify が落ちる)。`initPostHog` は冪等でサーバーでは何もしない
- 認証完了(`login_succeeded`)は、ボタン押下時にプロバイダを sessionStorage に置き、OAuth から戻った
  タブでセッションができた時点で突き合わせる。新規登録かはユーザー作成時刻(10分以内)で判定する

## 結果

- ✅ 記事クリック(企業・導線別)、ログインファネル(プロバイダ別)、保存・購読の操作、再訪が PostHog で見える
- ✅ メール・名前は PostHog に届かない
- ⚠️ 新しいイベントは `AnalyticsEvents` に型を足し、observability.md §4 の表に追記する
- ⚠️ `NEXT_PUBLIC_POSTHOG_KEY` はビルド時に埋め込まれるため、Vercel に設定した後は再デプロイが要る
- ❌ 広告ブロッカー利用者のイベントは数えない(必要になったらリバースプロキシで自ドメイン経由にする)
- ❌ セッション録画・ヒートマップは使わない(使うなら PII 表示要素に `ph-no-capture` を付けてから有効化)

## 関連リソース

- [docs/architecture/observability.md §4](../architecture/observability.md)
- PostHog: Next.js App Router への導入、`capture_pageview: 'history_change'`
