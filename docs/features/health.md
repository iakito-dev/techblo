# Feature: health(ヘルスチェック)

## 概要

外部の死活監視・デプロイ確認向けに、アプリの稼働状態を返す公開エンドポイント `GET /api/healthz`。env・DB・RSS 取込の3点を確認し、すべて正常なら 200、1つでも異常なら 503 を返す。

## ユーザーストーリー

- 運用者として、サイトが正常に動いているか外形監視したい、なぜなら障害に早く気づきたいから
- 運用者として、RSS 取込 cron が止まったら検知したい、なぜなら記事が更新されなくなるから

## 画面/UI

- UI は無い。JSON を返す Route Handler のみ(`app/api/healthz/route.ts`)
- **認証なしの公開エンドポイント**。個人情報・秘密値は返さない(env は変数名の欠落のみ)
- `cache-control: no-store`、`connection()` で毎リクエスト実行(cacheComponents 下では `force-dynamic` 不可)

## データモデル

- 専用テーブルは無い。`companies`(`enabled` / `lastFetchedAt` / `consecutiveFailures`)を集計する
- `lastFetchedAt` は取込成功時のみ更新、失敗時は `consecutiveFailures` が加算される(`lib/rss/ingest.ts`)

## API/Server Action

```ts
// features/health/web/queries.ts(composition root)
getHealthStatus(): Promise<HealthStatus>

// features/health/application/get-health-status.ts
getHealthStatus({ health, requiredEnv, now? }): Promise<HealthStatus>
```

`GET /api/healthz` のレスポンス例:

```json
{
  "ok": true,
  "status": "healthy",
  "checkedAt": "2026-06-20T12:00:00.000Z",
  "checks": {
    "env": { "ok": true, "missing": [] },
    "db": { "ok": true },
    "feed": {
      "ok": true,
      "enabledCompanies": 6,
      "staleCompanies": 1,
      "failingCompanies": 0,
      "newestFetchedAt": "2026-06-20T11:00:12.000Z"
    }
  }
}
```

## ビジネスルール

各チェックの判定基準:

| チェック | ok の条件 | 失敗時の message |
|---|---|---|
| `env` | 必須環境変数がすべて設定済み(欠落名は `missing`) | `required environment variables are missing` |
| `db` | `select 1` が成功する | `database query failed` |
| `feed` | 有効企業が1社以上、かつ `newestFetchedAt` が現在から3時間以内 | `no enabled companies` / `feed ingestion stalled` |

- DB チェックが失敗した場合、feed チェックはスキップされ `skipped because database check failed` になる。feed クエリ自体が失敗した場合は `feed freshness query failed`
- **200 / 503**: 3チェックすべて ok なら 200(`status: healthy`)、どれか1つでも ng なら 503(`status: unhealthy`)
- **閾値**: 取込の鮮度は `FEED_STALE_AFTER_HOURS = 3`(取込 cron は毎時0分に実行されるため、2回連続で取りこぼしても許容する余裕を持たせた値)。`staleCompanies` の集計と `failingCompanies` の連続失敗数の閾値(`FAILING_AFTER_COUNT = 3`)もここで定義
- **`staleCompanies` / `failingCompanies` は参考値**: レスポンスには含めるが ok 判定には使わない。外部ブログの RSS が1社壊れただけでサイト全体を unhealthy にしないため、「取込 cron 全体が止まっている」場合(= 全社の中で最新の取込成功も古い)だけ unhealthy とする

## エッジケース

- `newestFetchedAt` は postgres-js の生 SQL `max()` が文字列で返ることがあるため、Date / string どちらも ISO 文字列に正規化して判定する
- 全社が一度も取込成功していない(`newestFetchedAt` が null)場合は `feed ingestion stalled`

## メトリクス

- 外形監視(UptimeRobot 等)から `/api/healthz` の HTTP ステータスを監視する想定

## 関連

- 機能: feed(取込結果の表示側)
- `lib/rss/ingest.ts`(`lastFetchedAt` / `consecutiveFailures` の更新)、`trigger/fetch-feed-articles.ts`(毎時0分の取込 cron)
- ADR-0010(4層アーキ: domain / application / infrastructure / web)
