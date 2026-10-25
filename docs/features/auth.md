# Feature: auth(認証)

## 概要

Better Auth + ソーシャル OAuth(Google / GitHub / Discord)でユーザー認証を提供。未ログイン状態でも閲覧でき、**ブックマーク・お気に入りはゲストでも利用可能**(localStorage 保持 → ログイン時に DB へマージ、ADR-0017)。購読設定(/settings)はログイン必須。

> 旧仕様の「保存はログイン必須・未ログインはログイン誘導モーダル(LoginPromptDialog)」は ADR-0017 で置き換え。保存ボタンは `ArticleActions` に一本化した。

## ユーザーストーリー

- ユーザーとして、Google / GitHub / Discord アカウントで簡単にログインしたい
- ユーザーとして、初回ログイン時にアカウント情報の手入力をしたくない
- ユーザーとして、複数デバイスでログインを維持したい

## 画面/UI

- ログイン/登録導線は**設定タブ最上部の登録カード**に集約(`AccountCard`)。ゲストは「登録してデータを引き継ぐ」カード(無料登録 CTA + ログインリンク)、ログイン時はアカウント情報(アバター/名前/メール)と常時表示の「ログアウト」ボタンに置き換わる(ドロップダウンに隠さない)
- 認証ページは**`/login` 1画面に統合**(OAuth のみで「ログイン/新規登録」の操作が同一のため)。旧 `/signup` は `callbackURL` を維持して `/login` へリダイレクト。`AuthPanel` が利点リスト + `SocialSignInButtons` を描画し、見出しのみ `AuthHeading` が「前回利用」の記録有無で出し分ける(初回=「テクブロをはじめよう」/ 再訪=「おかえりなさい」)。相互リンク・mode 出し分けは廃止
- `SocialSignInButtons`: Google / GitHub / Discord を表示。1つを主役(全幅)+ 残りを「または」区切りのコンパクト2列に。直近に使った方法を `localStorage`(`features/auth/last-provider.ts`)に記録し、再訪時はそれを主役+「前回利用」表示に昇格。文言は中立な「{プロバイダ} で続ける」に統一
- ヘッダー(モバイル <md 以外 / タブレット)はログインボタンを出さない。ログイン時のアバターのみ表示。モバイル(<md)のフィードヘッダー(`MobileFeedControls`)はアバターも持たない(設定タブへ誘導)
- ブックマーク等の保存はゲストでも localStorage に保存でき(ADR-0017)、追加時は確認トースト「ブックマークに追加しました」のみ(登録 CTA は出さない)。一覧バナー/JIT モーダル等の登録導線は追加しない
- ログアウト: アバターメニュー内

## データモデル

Better Auth が管理するテーブル(`users`, `sessions`, `accounts`)を利用。
スキーマは `db/schema/auth.ts`。独自に追加する場合もここに拡張カラム(`onboarded_at` 等)を定義。

## 実装ファイル

| パス | 役割 |
|---|---|
| `lib/auth.ts` | Better Auth インスタンス(Google / GitHub / Discord OAuth・30日セッション) |
| `app/api/auth/[...all]/route.ts` | Better Auth API ハンドラ(`toNextJsHandler`) |
| `features/auth/server.ts` | `getSession` / `requireSession`(サーバー側) |
| `features/auth/client.ts` | `authClient` / `signIn` / `signOut` / `useSession` / `signInWithProvider` / `SocialProvider` |
| `features/auth/pending-login.ts` | ログインボタン押下時のプロバイダを sessionStorage に置き、認証完了(`login_succeeded`)の判定に使う |
| `features/auth/components/analytics-identity.tsx` | セッションと PostHog の同期(identify / reset / `login_succeeded`。client) |
| `features/auth/last-provider.ts` | 直近ログイン方法の `localStorage` 読み書き(`readLastProvider` / `writeLastProvider`) |
| `features/auth/components/social-sign-in-buttons.tsx` | Google / GitHub / Discord のログインボタン群(主役+「または」+コンパクト2列・前回利用を主役化) |
| `features/auth/components/auth-heading.tsx` | 認証画面の見出し(client・前回利用の有無で出し分け) |
| `features/auth/components/user-menu.tsx` | アバター + ログアウトのドロップダウン(client) |
| `features/auth/components/account-card.tsx` | 設定タブ最上部の登録 / アカウントカード(client・`useSession`) |
| `features/auth/components/auth-panel.tsx` | 認証ページの中央カード(利点リスト + ボタン群、`AuthHeading` 同梱) |
| `app/login/page.tsx` | 認証ページ(ログイン/新規登録 統合) |
| `app/signup/page.tsx` | `/login` へのリダイレクト(旧URL互換) |
| `components/layout/header.tsx` | `useSession()` でアバターを出し分け(ログインボタンは廃止) |

## API / Server Action

```ts
// features/auth/server.ts
getSession(): Promise<{ user, session } | null>
requireSession(): Promise<{ user, session }> // 未認証時は /login へ redirect

// features/auth/client.ts
useSession(): { data, isPending, error }
signInWithProvider(provider: SocialProvider, callbackURL?: string) // signIn.social のラッパ
// SocialProvider = 'google' | 'github' | 'discord'

// Better Auth 標準
signIn.social({ provider: 'google' | 'github' | 'discord' })
signOut()
```

## ビジネスルール

- OAuth プロバイダー: **Google / GitHub / Discord**(いずれも検証済みメールを返すため、同一メールのアカウントは Better Auth 既定の account linking で同一ユーザーへ自動統合される)
- セッション有効期間: 30日(Better Auth default)
- ログイン後のリダイレクト: ログイン誘導モーダル経由なら元のページ、それ以外は `/`
- 初回ログイン(ユーザー作成)時に subscriptions へ全有効企業をデフォルト挿入。Better Auth の `databaseHooks.user.create.after`(`lib/auth.ts`)→ `lib/initialize-user-subscriptions.ts` で実施(ADR-0012)。失敗してもログインは止めず error ログのみ

## エッジケース

- OAuth キャンセル → ログインモーダルを閉じてトーストでメッセージ
- OAuth プロバイダー側のエラー → エラーページにリダイレクト + Sentry記録
- セッション期限切れ → 静かに `/login` へリダイレクト

## メトリクス

PostHog のイベント(一覧と規約は [observability.md §4](../architecture/observability.md)):

| イベント | プロパティ | 発火 |
|---|---|---|
| `login_clicked` | provider | `SocialSignInButtons` の押下(ログイン・登録は同じ操作) |
| `login_succeeded` | provider, isNewUser | OAuth から戻ってセッションができたとき(`AnalyticsIdentity`)。押下時に `features/auth/pending-login.ts` が sessionStorage に置いたプロバイダと突き合わせる。isNewUser はユーザー作成から10分以内か |

- identify / reset も `AnalyticsIdentity`(`features/auth/components/analytics-identity.tsx`)が行う。ログイン中は Better Auth のユーザー id だけで identify し(メール・名前は送らない)、未ログインで識別済みなら reset する
- ログイン成功率
- ログイン誘導モーダル表示 → 実際のログイン率
- 月次アクティブユーザー(MAU)

## 関連

- ADR-0001 (技術スタック: Better Auth採用)
- 機能: subscriptions(ログイン後に初期化)
