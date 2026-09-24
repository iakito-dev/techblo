# Techblo 技術スタック

## 採用スタック一覧

### コア
| 領域 | 技術 | バージョン目安 |
|---|---|---|
| フレームワーク | **Next.js** (App Router) | 16.x(現在 16.2) |
| 言語 | **TypeScript** | 5.6+ |
| ランタイム | **React** | 19.x |
| 最適化 | **React Compiler** + **PPR** + **Turbopack**(stable) | 標準有効化 |
| AI開発支援 | **agent-ready create-next-app** + **Browser Log Forwarding** + **Server Fast Refresh** | Next.js 16 標準 |

### UI
| 領域 | 技術 |
|---|---|
| スタイリング | **Tailwind CSS v4** |
| コンポーネント | **shadcn/ui**(Radix UI ベース) |
| アニメーション | **motion** (旧 Framer Motion) + **View Transitions API** |
| Drawer/Modal | **vaul** |
| Toast | **sonner** |
| Command Palette | **cmdk** |
| アイコン | **Lucide React** |

### データ層
| 領域 | 技術 |
|---|---|
| DB | **Supabase Postgres**(東京リージョン・Transaction Pooler 経由。ADR-0033 で Neon から移行) |
| ORM | **Drizzle ORM** + Drizzle Studio |
| バリデーション | **Zod 4** |

### 認証
| 領域 | 技術 |
|---|---|
| 認証ライブラリ | **Better Auth** |
| プロバイダー | Google / GitHub / Discord OAuth |

### バックグラウンド処理
| 領域 | 技術 |
|---|---|
| ジョブキュー | **Trigger.dev v4** |
| 用途 | RSS定期取得、AI要約・カテゴリ分類バッチ |

### AI
| 領域 | 技術 |
|---|---|
| AI SDK | **Vercel AI SDK** + Google Gemini(`lib/ai/llm-client.ts`。要約は ADR-0026) |
| 拡張 | **MCP** + **Claude Agent SDK** |

### 状態管理
| 領域 | 技術 |
|---|---|
| クライアント状態 | **Zustand** |
| サーバー状態 | **TanStack Query v5** |

### 観測・運用
| 領域 | 技術 |
|---|---|
| エラー監視 | **Sentry**(導入予定・未導入) |
| プロダクト分析 | **PostHog**(アナリティクス + Feature Flag + セッション録画) |

### 開発基盤
| 領域 | 技術 |
|---|---|
| ホスティング | **Vercel** (Hobby plan) |
| パッケージマネージャ | **Bun** |
| Linter/Formatter | **Biome** |
| 単体テスト | **Vitest** |
| E2Eテスト | **Playwright** |
| コンポーネント開発 | **Storybook 8** |

### 周辺
| 領域 | 技術 |
|---|---|
| メール(将来) | **Resend** + **React Email** |
| 画像 | `next/image` + OGPホットリンク |
| RSS パース | **fast-xml-parser** + Zod スキーマ検証 |

---

## コスト試算(MVP段階)

| 項目 | 無料枠 | 月額 |
|---|---|---|
| Vercel Hobby | 100GB帯域、Cron無制限 | $0 |
| Supabase Free | プラン条件は Supabase の料金ページで確認 | $0 |
| Better Auth | OSS自前ホスト | $0 |
| Trigger.dev Free | 5,000 runs/月 | $0 |
| PostHog Free | 1Mイベント/月、5Kセッション録画 | $0 |
| Sentry Free | 5K errors/月 | $0 |
| Resend Free | 3K通/月 | $0 |
| **合計** | | **$0/月** |

スケール時の有料化ライン例:
- Vercel Pro($20/月)— 帯域超過 or Cron頻度up
- Supabase Pro — DB 容量超過 or 計算リソース増

### 無料枠の注意事項(確認済み)

| サービス | 注意点 |
|---|---|
| **Vercel Hobby** | ToS上「personal, non-commercial use」限定。**収益化時は Pro/Cloudflare Pages/Netlify へ移行** |
| **Trigger.dev Free** | 5,000 runs ではなく **$5/月クレジット** が実質無料分 |
| **PostHog Free** | 超過すると自動課金発生 → **Billing Limit を必ず設定** |
| **Sentry Developer** | 1ユーザーのみ、エラー5K/月 |
| **Resend Free** | 月3,000通 + **日100通上限**、1ドメイン |

---

## アーキテクチャ概念図

```
                    [Browser]
                        ↓
        ┌─────────────────────────────────┐
        │  Vercel Edge (Next.js 16 + PPR) │
        └─────────────────────────────────┘
              ↓              ↓
        Server Actions   Route Handlers
              ↓              ↓
     ┌──────────────┐   ┌─────────────────┐
     │ Drizzle ORM  │   │ Vercel AI SDK   │
     │ Better Auth  │   │ (将来)          │
     └──────────────┘   └─────────────────┘
              ↓
        ┌─────────┐
        │Supabase │
        │Postgres │
        └─────────┘
              ↑
   ┌─────────────────────┐
   │ Trigger.dev v4      │
   │ (RSS取得・AI要約)   │
   └─────────────────────┘
              ↓
     [Sentry] [PostHog]
       監視     分析
```

---

## 採用判断のポイント

### 「AI-first」を満たす理由
- すべてTypeScript + Zod型統一でClaude Code / Copilotの生成精度が最大
- shadcn/uiはAI生成での実績が圧倒的(コピーペースト型)
- Vercel AI SDK + MCP + Claude Agent SDK で将来AI機能を即追加可能
- Drizzleのスキーマ定義がそのままTS型 → AI生成のクエリが安定

### コスト最小化の根拠
- 全サービスがGenerousな無料枠を提供
- スケールするまで $0/月 で運用可能
- Better Auth / Drizzle / Biome はOSS、ランニングコストゼロ

### 学習コストが過大にならない理由
- Next.js + Tailwindは資料が世界一豊富
- shadcn/uiはコピペで動く、内部実装は気にしなくてOK
- DrizzleはPrismaより概念が少ない
- Better AuthはAPIがシンプル

### 保守性・スケーラビリティ
- Postgres = 業界標準、ベンダー移行容易
- Server Actions + Drizzleでバックエンド分離不要だが、必要になれば Hono 等で容易に分離可能
- shadcn/uiは「自分のコード」なのでベンダーロックなし
- (旧)Neon の DB branching 前提の記述は ADR-0033 で撤回。テスト DB は `TEST_DATABASE_URL` の別インスタンス

---

## 不採用にした代替案(参考)

| 代替 | 不採用理由 |
|---|---|
| SvelteKit / Astro / Nuxt | エコシステム規模、shadcn/ui同等品、AI assistantsの精度 |
| Remix | App Router の Next.js とほぼ同等、情報量で劣る |
| Prisma | 重い、Serverless遅、AIプロンプト消費が大きい |
| Supabase(当初) | 当初は DB branching で Neon を採用したが、ADR-0033 で Supabase(東京)へ移行済み。認証は Better Auth のまま |
| Clerk(認証) | 月10k MAU超で$25/月発生、Better Authで十分 |
| Cloudflare Pages + Workers | Next.js互換が不完全、Hyperdrive必要 |
| LangChain | 個人開発には過剰、Vercel AI SDKで十分 |
| Inngest | Trigger.devと近いが、UI/DXでTrigger.devが上 |
| PNPm / npm | Bunの方が高速、TS実行もbun一発 |
| ESLint + Prettier | Biome1つで代替可、設定簡素化 |
