# ADR-0001: 技術スタック選定

- **状態**: Accepted(DB は Neon → Supabase へ移行。ADR-0033 で更新)
- **決定日**: 2026-05-28
- **関連**: ADR-0003, ADR-0033

## 背景

Techblo は個人開発の公開Webサービスとして、以下を同時に満たす技術選択が必要だった:

- AI-firstで将来AI機能を統合しやすい
- 個人開発でコスト・運用負荷が低い
- 学習コストが過大でない
- 保守性・スケーラビリティがある
- モダンなUIが実現可能
- パフォーマンス良好

## 検討した選択肢

### A. Next.js + Supabase + Prisma + Vercel(保守的モダン)

- 王道スタック、情報量豊富
- Supabase で認証・DB・Storage がワンストップ
- Prismaは重く、Serverlessでcold startが遅い

### B. Next.js 16 + Neon + Drizzle + Better Auth + Trigger.dev + Vercel(アグレッシブモダン)

- Next.js 16(2026年3月リリース)で `next dev` 4倍高速、レンダリング 50% 高速化
- agent-ready `create-next-app` + Browser Log Forwarding で AI開発に最適
- React 19 + PPR + React Compiler + Turbopack stable
- Neon の DB branching で開発フロー革新
- Better Auth で認証ベンダーロックなし
- Trigger.dev で観測可能なバックグラウンドジョブ
- 新興ライブラリが多くQ&Aが少ない可能性

### C. SvelteKit / Astro / Remix

- バンドル軽量
- shadcn/ui 同等のエコシステムが弱い
- AI assistants の生成精度が Next.js より落ちる

### D. Cloudflare Workers + D1 + Hyperdrive

- Edgeネイティブで超低レイテンシ
- Next.js との互換性が完全でない
- Hyperdrive 等を組み込むと複雑度up

## 決定

**B. Next.js + Neon + Drizzle + Better Auth + Trigger.dev + Vercel** を採用。

理由:
1. AI assistants(Claude Code 等)の生成精度が Next.js + Drizzle で最大化
2. shadcn/ui で海外アプリ風UIを最短で実現
3. Neon の DB branching が開発体験を大きく改善
4. 全サービスが Generous Free Tier を持ち、MVP は $0/月
5. すべてOSSライブラリのため、必要時に乗換え可能

## 結果

- ✅ MVP段階は $0/月で運用可能
- ✅ React Compiler により `useMemo` 等を書かない高パフォーマンス
- ✅ Better Auth は将来 Clerk 等への乗換えが容易(独立した抽象)
- ⚠️ Vercel Hobby は "non-commercial use" 制限あり、収益化時に Pro / Cloudflare / Netlify へ移行が必要
- ⚠️ 新興ライブラリ(Better Auth等)のQ&Aは少ない
- ❌ React Compiler 等の最先端機能は稀にバグ報告あり

## 関連リソース

- [TECH_STACK.md](/TECH_STACK.md)
