# 新しい企業ブログを追加する手順

Techblo は MVP では「ユーザーによる企業追加」を提供しない(`docs/adr/0005-mvp-exclusions.md`)。
開発者が直接DBに追加することで運用する。

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
  誤記しているフィードは `feed_timezone` の設定が必要(下記)。メルカリが実例(ADR-0025)。

## ステップ2: ブランドカラーを決める

公式サイトのプライマリーカラーを HEX で取得。
シミュレーター(MVPは6社の例: LINEヤフー #06c755 等)に倣う。

## ステップ3: `companies` テーブルに INSERT

```sql
INSERT INTO companies (name, slug, rss_url, brand_color, site_url)
VALUES ('企業名', 'company-slug', 'https://...feed.xml', '#XXXXXX', 'https://...');
```

または Drizzle Studio から GUI で追加。

**TZ がずれているフィードの場合** は `feed_timezone` に正しい IANA タイムゾーンを設定する
(指定すると宣言 TZ を無視し、壁時計をその TZ で解釈する。ADR-0025):

```sql
-- 例: 壁時計は JST だが GMT と誤記しているフィード
UPDATE companies SET feed_timezone = 'Asia/Tokyo' WHERE slug = 'company-slug';
```

未設定でも未来日付ガードが「たった今」固定を防ぐが、相対表記が実時刻からずれるので
TZ がずれるフィードでは必ず設定する。

## ステップ4: 全ユーザーの subscriptions に追加

新企業をデフォルトONで全既存ユーザーに INSERT:

```sql
INSERT INTO subscriptions (user_id, company_id, enabled)
SELECT id, '{new_company_id}', true FROM users
ON CONFLICT DO NOTHING;
```

または Trigger.dev のadminジョブを発火。

## ステップ5: `next.config.ts` の remotePatterns に追加

OGP画像のホットリンクを許可するため、Next.js Image の許可リストに追加:

```ts
// next.config.ts
images: {
  remotePatterns: [
    // ... 既存
    { protocol: 'https', hostname: 'new-company.com' },
  ],
}
```

## ステップ6: RSS取得ジョブを手動実行

```bash
# Trigger.dev のダッシュボードから fetch-company-feed を手動実行
# または開発環境で
bun run jobs/refresh-company-feed.ts --company-id={new_company_id}
```

## ステップ7: 表示確認

- トップ画面に新企業の記事が表示されるか
- 企業ブランドカラーがchipに正しく反映されているか
- OGP画像が読み込まれるか(失敗時はプレースホルダー)

## ステップ8: ドキュメント更新

- [ ] `REQUIREMENTS.md` の「対象ブログ」表に追加
- [ ] 必要なら `docs/features/feed.md` の関連リソースを更新

## ステップ9: 観測

追加後1週間は Trigger.dev のダッシュボードで取得失敗が増えていないか監視。
失敗が連続するなら RSS URL を見直す。

## 追加できないケース

| 状況 | 対応 |
|---|---|
| 公式RSSなし | スクレイピング or RSSHub経由(将来フェーズ) |
| HTML feed のみ(画像なし) | プレースホルダー画像で運用 |
| 認証必要 | 対象外 |
| 著作権が厳しい | 弁護士相談 or 対象外 |
