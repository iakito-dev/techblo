# Security

個人開発でも最低限抑えるべき項目。OWASP Top 10 をベースに整理。

## 1. 認証(Authentication)

- **Better Auth** + Google OAuth
- セッション cookie: `HttpOnly`, `Secure`, `SameSite=Lax`
- セッション有効期間: 30日(Better Auth default)
- ログアウト時はサーバー側でセッション無効化

## 2. 認可(Authorization)

- すべての Server Action で `requireSession()` を呼ぶ
- 操作対象の所有者チェックは `policies.ts` で実施
- ID推測攻撃を避けるため、すべての主キーは **UUID v7**

```ts
// ❌ NG: ID で取得しているだけ、所有者チェックなし
await db.delete(bookmarks).where(eq(bookmarks.id, input.id));

// ✅ OK: user_id も合わせて条件に
await db.delete(bookmarks).where(and(
  eq(bookmarks.id, input.id),
  eq(bookmarks.user_id, session.user.id),
));
```

## 3. 入力検証(Input Validation)

- すべての外部入力は **Zod schema で parse**
- 検証失敗は `{ kind: 'VALIDATION' }` として扱う
- 文字列の最大長を明示(`z.string().max(N)`)
- URL は `z.string().url()` で形式チェック

## 4. SQL Injection

- Drizzle ORM を使う限り **パラメータバインディング** で安全
- 生 SQL は `sql` template literal でエスケープを必ず使う
- 外部入力をそのまま `sql.raw(input)` に渡さない(禁止)

## 5. XSS

- React は JSX レンダリング時に自動エスケープ
- `dangerouslySetInnerHTML` は **使用禁止**(必要なら sanitize-html)
- RSS の description は HTML を含むため、表示前にサニタイズが必要

```ts
import sanitizeHtml from 'sanitize-html';

const safeDescription = sanitizeHtml(article.description, {
  allowedTags: ['p', 'br', 'strong', 'em', 'code'],
  allowedAttributes: {},
});
```

## 6. CSRF

- Server Actions は同一オリジン制約 + cookie の SameSite で基本防御
- Route Handler で破壊的操作するときは Origin/Referer ヘッダー検証

## 7. CORS

- Server Actions / Route Handlers は同一オリジンのみ
- 外部公開API(将来)は明示的 CORS 設定

## 8. シークレット管理

- すべての秘密情報は **環境変数 + `lib/env.ts`** で取得
- `process.env.X` の直接参照禁止(typo 防止 + 起動時検証)
- Git に `.env*` をコミットしない(`.env.example` のみ)
- Vercel の Environment Variables を本番 source of truth に

## 9. 依存パッケージ

- `bun audit` を CI で実行
- Dependabot / Renovate で脆弱性更新を自動PR
- 怪しい新興パッケージは導入しない(評価軸: 公式・stars・最終commit日)

## 10. レート制限

MVP範囲ではVercel Edgeのデフォルトに依存。
将来はUpstash Redisで実装:

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});
```

## 11. ヘッダー設定

```ts
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options',        value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }];
}
```

CSP は別途設計。

## 12. OGP ホットリンクのリスク

- `next.config.ts` の `remotePatterns` で許可済みドメインのみ
- ホストされた画像経由でJSが実行されることはない(`<img>` のみ)
- ただし、トラッキング pixel として悪用される可能性は理論上ある → User-Agent を匿名化

## 13. ユーザー削除時の処理

- すべての個人データを ON DELETE CASCADE で削除
- セッション無効化
- ログから userId を削除 or 匿名化(GDPR想定で対応)

## 14. ログ・観測の PII 取扱

- email, name, profile_image を logger/Sentry に含めない
- userId のみ(突合は管理者権限で別途)

## 15. テスト時の隔離

- 統合テストは専用のテスト用 DB(`TEST_DATABASE_URL`)で実行(本番影響なし)
- E2E は専用テストアカウント
- 本番DBにテストデータを混入させない

## 関連

- [backend.md](./backend.md) — 認可実装パターン
- [observability.md](./observability.md) — PII の扱い
