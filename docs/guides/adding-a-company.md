# 新しい企業ブログを追加する手順

Techblo は MVP では「ユーザーによる企業追加」を提供しない(`docs/adr/0005-mvp-exclusions.md`)。
開発者が `scripts/seed.ts`(企業マスタの真実源)に追記し、main へのマージで本番に反映する。

## ステップ1: RSS URL を確認

候補のRSS URLを確認:

```bash
curl -sL https://example.com/feed.xml | head -50
```

以下を確認:
- 有効なRSS/Atomフィードか
- 更新頻度
- 配信形式(full content か 抜粋か)
- 安定して取得できるか(時間を空けて2回試す)
- **日付(`pubDate`/`published`)の TZ が正しいか**。記事の実公開時刻と `pubDate` の壁時計・TZ が
  整合しているか確認する。TZ が欠落している、または壁時計はローカル時刻なのに `GMT`/`Z` と
  誤記しているフィードは `feedTimezone` の設定が必要(下記)。メルカリが実例(ADR-0025)。

Zenn Publication は `https://zenn.dev/p/{publication}/feed`、note のマガジンは
`https://note.com/{user}/m/{key}/rss` の形式。既存の企業を参考にする。

## ステップ2: ブランドカラーを決める

公式サイトのプライマリーカラーを HEX で取得(例: LINEヤフー `#06c755`)。

## ステップ3: `scripts/seed.ts` に追記

`SEED_COMPANIES` に1件追加する:

```ts
{
  slug: 'company-slug',
  name: '企業名',
  rssUrl: 'https://example.com/feed.xml',
  siteUrl: 'https://example.com/',
  brandColor: '#XXXXXX',
  description: '〇〇 テックブログ',
},
```

- 公式RSSが無く代替フィード(Zenn・note・コミュニティ製など)を使う場合は、理由をコメントで残す
- **TZ がずれているフィード** は `feedTimezone` に正しい IANA タイムゾーンを設定する
  (指定すると宣言 TZ を無視し、壁時計をその TZ で解釈する。ADR-0025)。
  未設定でも未来日付ガードが「たった今」固定を防ぐが、相対表記が実時刻からずれる

```ts
// 例: 壁時計は JST だが GMT と誤記しているフィード
feedTimezone: 'Asia/Tokyo',
```

ローカル DB で確かめるなら `bun run db:seed` → `bun run scripts/ingest.ts`(enabled な全企業を取り込む)。

## ステップ4: PR を作って main にマージ

マージすると Deploy ワークフロー(`.github/workflows/deploy.yml`)が `scripts/seed.ts` の変更を
検知し、本番 DB に `bun run db:seed` を実行する(slug で冪等 upsert)。手動の SQL 実行は不要。

以下も不要:
- **subscriptions への追加**: 購読の状態行が無い企業はデフォルト ON として扱われる
  (`docs/features/subscriptions.md`)
- **`next.config.ts` の `remotePatterns`**: OGP 画像・ファビコンは `<img>` で直接表示しており、
  next/image の最適化対象外(ADR-0004)

## ステップ5: 取り込みを待つ

Trigger.dev の `fetch-feed-articles` が毎時0分に enabled な全企業を取り込む。
すぐ確認したい場合は Trigger.dev のダッシュボードから手動実行する。

## ステップ6: 表示確認

- トップ画面に新企業の記事が表示されるか
- 企業ブランドカラーがchipに正しく反映されているか
- OGP画像が読み込まれるか(失敗時はプレースホルダー)

## ステップ7: 観測

追加後1週間は Trigger.dev のダッシュボードで取得失敗が増えていないか監視。
失敗が連続するなら RSS URL を見直す。問題があれば `enabled: false` にして取り込みを止める。

## 追加できないケース

| 状況 | 対応 |
|---|---|
| 公式RSSなし | 公式が案内する Zenn/note などの代替フィード、またはコミュニティ製フィード(Anthropic が実例) |
| HTML feed のみ(画像なし) | プレースホルダー画像で運用 |
| 認証必要 | 対象外 |
| 著作権が厳しい | 弁護士相談 or 対象外 |
