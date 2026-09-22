# ADR-0025: フィード単位のタイムゾーン補正と未来日付ガード

- **状態**: Accepted
- **決定日**: 2026-06-12
- **関連**: ADR-0013(フィードキャッシュ), ADR-0018(人気順 velocity), feed.md

## 背景

メルカリの記事だけ長時間「たった今」と表示される事象を調査した結果、メルカリの RSS が
`<pubDate>Fri, 12 Jun 2026 10:00:39 GMT</pubDate>` のように **壁時計は JST(10:00) なのに TZ を
GMT と誤ってラベリング** していた（DB と実フィードで実証。実公開 10:00 JST = 01:00 UTC、cron も
01:01 UTC に取込済みだが `published_at` は 10:00 UTC = +9 時間 未来に保存される）。

[parser.ts](../../lib/rss/parser.ts) は `new Date(pubDate)` で宣言 TZ を信用するため、`10:00 GMT` を
正しく 10:00 UTC と解釈し、結果9時間先の時刻が保存される。[formatRelative](../../shared/date.ts) は
`publishedAt > now` のとき「たった今」を返すので、取込後〜実時刻が追い越すまでの約9時間それが続き、
新着順でも先頭に固定されていた。

これはメルカリ側フィードの不具合だが上流修正は待てない。今後 TZ 欠落・誤記のフィードを新規追加しても
破綻しないよう、汎用の補正機構を入れる。

## 検討した選択肢

- **A. メルカリ専用の −9h 補正** — 脆い(メルカリが直すと二重ずれ)。却下。
- **B. フィード単位の TZ 設定 + 壁時計再解釈(採用)** — 各フィードに正しい TZ を持たせ、宣言 TZ を
  無視して壁時計をその TZ で解釈する。TZ 欠落・誤記の両方を同一ロジックで吸収でき、メルカリが将来
  `+09:00` に直しても壁時計は不変なので壊れない。
- **C. 未来日付クランプのみ** — 安全網にはなるが、TZ がずれた「過去寄り」のケースは補正できない。
  B の補助として併用する。

## 決定

**B + C** を採用。

### 1. フィード単位の TZ 設定（B）
- `companies.feedTimezone`(IANA 名, nullable) を追加（[db/schema/companies.ts](../../db/schema/companies.ts)、
  migration `0005_remarkable_alice.sql`）。
  - **null** → 宣言 TZ を信用（`new Date(v)`、従来動作。TZ を正しく付ける大半の企業向け）。
  - **'Asia/Tokyo' 等** → 日付文字列から壁時計(年月日時分秒)だけを正規表現で抽出し、宣言オフセットを
    捨てて `date-fns-tz` の `fromZonedTime(壁時計, feedTimezone)` で UTC へ変換する。
- [parser.ts](../../lib/rss/parser.ts) の `parseFeed(xml, { feedTimezone, now })` で受け、`parseDate` /
  `extractWallClock`(ISO8601・RFC822 両対応) で実装。[ingest.ts](../../lib/rss/ingest.ts) が
  `companies.feedTimezone` を select して渡す。
- メルカリは `feedTimezone='Asia/Tokyo'` を設定（[scripts/seed.ts](../../scripts/seed.ts) + 既存 row を
  `UPDATE`）。

### 2. 未来日付ガード（C）
- 取込時、`publishedAt > now + 10分` の項目は **取込時刻にクランプ** し `logger.warn` する
  ([parser.ts](../../lib/rss/parser.ts) `resolvePublishedAt`)。
- feedTimezone 未設定の新規フィードが TZ をずらしていても「未来日付で並びが壊れ、相対表記が
  『たった今』固定になる」ことを防ぎ、誤設定をログで検知できる。

## 結果

- ✅ 実フィード検証: 新コード + `feedTimezone='Asia/Tokyo'` でメルカリ最新記事が `01:00:39Z`(=10:00 JST)に
  正規化。feedTimezone なしでも未来日付ガードが取込時刻にクランプ（warn 出力）。
- ✅ `date-fns-tz` を文字列形式で使うため実行環境 TZ に依存しない（`TZ=America/New_York` でも同結果）。
- ✅ ユニットテスト4ケース追加（[parser.test.ts](../../lib/rss/parser.test.ts)）。
- ⚠️ **既存メルカリ記事の +9h ずれはバックフィルしない**（[upsert](../../features/feed/application/upsert-articles.ts) の
  `onConflictDoUpdate` は `published_at` を更新しないため、既存行は補正されず新規取込分から正しくなる）。
  必要になれば `UPDATE articles SET published_at = published_at - interval '9 hours' WHERE company_id=(mercari)` を別途。
- ⚠️ メルカリ上流の TZ 誤記は本質的にはメルカリ側の不具合。可能なら別途報告する。

## 関連リソース
- [lib/rss/parser.ts](../../lib/rss/parser.ts)(`parseFeedDate`/`extractWallClock`/`resolvePublishedAt`)
- [lib/rss/ingest.ts](../../lib/rss/ingest.ts)
- [db/schema/companies.ts](../../db/schema/companies.ts)(`feedTimezone`)
- [docs/guides/adding-a-company.md](../guides/adding-a-company.md)
