# ADR-0010: feature 内部のレイヤード + ヘキサゴナル(軽量DDD)

- **状態**: Accepted
- **決定日**: 2026-05-29
- **関連**: ADR-0002(Feature-sliced を維持・拡張), ADR-0003(server-first を維持)

## 背景

ADR-0002 で Feature-sliced を採用し、各 feature に `types/queries/actions/policies/components` を直置きしていた。feed feature を実装したところ、以下の保守性の問題が顕在化した:

- 人気スコア計算(`view + bookmark*2 + favorite*3`)が Drizzle の `sql` に直書きされ、純粋関数として単体テストできない
- `getArticles` は throw、`upsertArticles` は Result と、エラーの扱いが不統一
- DB 行 → 表示型のマッピングが各 query に手書きで重複
- `lib/rss/ingest.ts` が `features/feed/queries` を import する**レイヤー逆流**(lib → features)
- ビジネスロジックが Drizzle(infrastructure)と密結合し、将来の DB / フレームワーク差し替えが困難

「工数をかけてでも後で楽になる構造」かつ「サーバーロジックをフロント・Next.js・DB から独立させ、将来の他言語/FW 移行を可能にする」ことが求められた。

## 検討した選択肢

### A. 現状維持(types/queries/actions 直置き)

- 追加学習コストゼロ
- 上記の保守性問題が feature 追加のたびに再発する

### B. トップレベルで物理3層分割(`core/` `infrastructure/` `web/`)

- レイヤー境界が物理的に明確
- ADR-0002 の「1機能=1フォルダ・丸ごと削除可能」という凝集性を失う
- 1機能の変更で複数トップレベルを横断、初心者の認知負荷が高い

### C. feature 内部を層化(domain / application / infrastructure / web)+ Port & Adapter

- Feature-sliced を維持しつつ、各 feature 内部で依存方向を強制
- domain(純粋)と application(ユースケース)が DB なしで単体テスト可能
- Repository を Driven Port として domain に定義、実装を infrastructure に置く → DB 差し替え可能
- 「feed を見れば全層が一望できる」学習しやすさ

採用方法論は `clean-ddd-hexagonal` skill(Clean Architecture + DDD + Hexagonal)。ただし同 skill の「MVP / 1〜2人 / 単一 API / 固定インフラではフル DDD をスキップ」指針に従う。

## 決定

**C. feature 内部を層化** を採用。各 feature を以下に分割する:

```
features/{name}/
  domain/          # 外部依存ゼロの純粋 TS(entity / value object / domain service / Repository interface)
  application/     # ユースケース(依存は引数注入)+ DTO
  infrastructure/  # Driven Adapter(Drizzle 実装・mapper)。db を import してよい唯一の層
  web/             # Driving Adapter(RSC が呼ぶ composition root / Server Action / ViewModel / components)
```

- 依存方向は内向きのみ: `web / infrastructure → application → domain`
- Driven Port(Repository interface)は domain に置き、実装は infrastructure に
- 表示ロジックは web/view-models の Client hook(ViewModel)に分離。ただし RSC 主軸は維持し、データ取得はサーバー(純粋クライアント MVVM にはしない)
- `db/` への直接アクセスは **infrastructure 層のみ**(ADR-0002 の「queries.ts に限定」を更新)
- ingest 等の lib は feature を import せず、保存処理は関数注入(sink)で受け取る

**今回は見送る**(必要になった時点で Port 境界の内側に後付けする):

- 集約ルート / ドメインイベント / CQRS / Unit of Work — 単表操作で足り、複数 Aggregate 横断の整合性要件がない
- 物理的な API 分離 — Port を切ってあるので将来 REST/GraphQL を Driving Adapter として追加可能(ADR-0003 維持)
- DI コンテナ — composition root での手動注入で十分

## 結果

- ✅ domain / application が DB なしで単体テスト可能(人気スコア・カーソル・ページネーション)
- ✅ ビジネスロジックが Drizzle / Next / React から独立し、移行時の設計図になる
- ✅ lib → features の逆流を解消(sink 注入)
- ✅ Result の扱いが web 境界に一元化され統一
- ⚠️ feature あたりのファイル数・ボイラープレートが増える(層ごとの薄いファイル)
- ⚠️ 既存 feature(feed)以外への展開が必要(bookmarks/favorites/subscriptions)
- ❌ 軽量化のため戦術 DDD の一部(集約・イベント等)を意図的に省く。本格 DDD が必要になれば追加 ADR で見直す

## 関連リソース

- [ADR-0002: Feature-sliced アーキテクチャ](./0002-feature-sliced-architecture.md)
- [docs/guides/adding-a-feature.md](../guides/adding-a-feature.md)
- [docs/architecture/frontend.md](../architecture/frontend.md)
- `clean-ddd-hexagonal` skill(ccheney/robust-skills)
