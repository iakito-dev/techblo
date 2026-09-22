# ADR-0018: 人気順を「累計はてブ数」から「伸び速度(velocity)」へ

- **状態**: Accepted
- **決定日**: 2026-06-04
- **関連**: ADR-0014(人気順に外部シグナル=はてブ数を採用), ADR-0010(feature 内4層), ADR-0013(オフセットページング+フィードキャッシュ)

## 背景

ADR-0014 で人気順の主シグナルをはてなブックマーク数(外部シグナル)に切り替え、ユーザーが少なくても人気順が機能するようにした。しかし運用してみると「累計はてブ数 × 時間減衰」には限界が見えた。

- 本サービスは個人開発でユーザーが実質1人。内部シグナル(view/bookmark/favorite)は 0 に張り付くため、人気スコアは実質 `(hatena*4 + 1) / (経過時間h + 2)^1.5` で動いている。
- これは **累計のはてブ数**を見ている。「公開から数日かけて100ブクマ付いた古株」が、「公開直後に急速に伸びている記事」より上に出やすい。人気順としての「今の盛り上がり」が弱い。
- ADR-0014 自身が「はてブは公開後数日かけて伸びる。1回の取得では不十分」「将来は cron 化も検討」を積み残していた。

「今、伸びている」を表すには累計ではなく **増加速度(velocity)** を見る必要がある。velocity = Δはてブ ÷ 経過時間。これには過去の値(時系列スナップショット)と等間隔に近い定期取得が要る。

現状の制約:

- `articles` テーブルは `hatena_bookmark_count` の**最新値しか持たない**(`metrics_fetched_at` は最終取得時刻のみ)。
- はてブ取得は Trigger.dev scheduled task で数時間おきに走らせる必要がある。
- Vercel Cron は Hobby プランで1日1回までのため、数時間おきの取得には使えない。

## 検討した選択肢

### スコア・データ構造

#### A. articles に2カラム(prev_count / prev_at)を持つ差分方式

- 内容: 記事行に「前回値」を1つ持ち、`velocity = (now - prev) / (now_at - prev_at)`
- メリット: 新テーブル不要・O(1) ストレージ・実装が最小
- デメリット: ルックバック窓が直前の取得間隔に固定され、取得が不規則だと窓がブレて velocity が不安定。24h など意味のある窓を切れない

#### B. スナップショット履歴テーブル + trend_score 事前計算(採用)

- 内容: `article_metric_snapshots` に (article_id, hatena_count, captured_at) を append。取得のたびに「約24h前のスナップショット」と現在値から velocity を計算し、`articles.trend_score` に書き込む。ランキングは `ORDER BY trend_score DESC` だけ
- メリット:
  - 任意の固定窓(24h 等)で安定した velocity を取れる。取得間隔がブレても `captured_at` の実時刻で Δ を計算するので頑健
  - trend_score を事前計算列にすることで、ADR-0014 で問題になった「`now()` 依存でランキングに索引が張れない」を解消(計算時に age 確定 → 索引可・高速)
- デメリット: テーブル追加・cron・再計算ロジックが要る。スナップショット行が増える(保持期間で間引き)

#### C. クエリ時にスナップショットを join して velocity を都度計算

- 内容: ランキング時に約24h前の snapshot を join して velocity を算出
- メリット: 事前計算が要らず窓を動的に変えられる
- デメリット: `now()` 依存で索引が張れず、ランキングのたびに join + 計算。ADR-0014 が避けた問題に逆戻り

### スケジューラ

#### D. Vercel Cron

- Hobby は1日1回まで。velocity の数時間おき取得に不足。却下

#### E. GitHub Actions scheduled workflow → 保護ルート

- 完全無料・新サービス不要。60日無活動で自動停止する難点

#### F. trigger.dev scheduled task(採用)

- 既に `@trigger.dev/sdk` 導入済み(`trigger:dev` / `trigger:deploy` スクリプトあり)。本来この用途のための依存
- 無料枠で sub-daily 実行可。リトライ・実行履歴・監視が標準装備
- 未設定なので `trigger.config` と接続作業が要る

## 決定

**B(スナップショット履歴 + trend_score 事前計算)** を **F(trigger.dev scheduled task)** で回す。

### データ

- 新テーブル `article_metric_snapshots`:
  - `article_id` uuid (FK → articles, ON DELETE CASCADE)
  - `hatena_count` int
  - `captured_at` timestamptz default now()
  - index (article_id, captured_at desc)
- `articles` に `trend_score`(double precision, default 0)を追加し、`(trend_score desc)` の索引を張る

### 取得・計算(trigger.dev scheduled task, 例: 1時間おき)

各実行で:

1. 直近30日の非削除記事の URL ではてブ数を取得(既存 `fetchBookmarkCounts` を再利用)
2. `article_metric_snapshots` に1行 append し、`articles.hatena_bookmark_count` / `metrics_fetched_at` を更新(既存 `updateHatenaCounts` 相当)
3. 各記事の `trend_score` を再計算して書き込む:

```
Δwindow    = max(0, hatena_now − hatena_(窓時間前))   # 窓時間 = 6h(取得間隔に合わせる)
velocity   = (Δwindow + 1) / (age_h + 2)^gravity_light   # gravity_light = 1.0(弱めの減衰)
trend_score = velocity
```

- **窓は 6 時間**(取得間隔と同じ)。「今日」タブの記事はほぼ公開24h以内のため、窓を 24h にすると
  窓内にスナップショットが入らずほぼ全てコールドスタートに落ちる。窓を取得間隔まで詰めて、公開数時間の
  記事でも velocity が出るようにする
- **コールドスタート**: 窓ぶん(6h)前のスナップショットが無い(公開直後)記事は Δ が出せない。
  最初の約6hは ADR-0014 の減衰つき累計スコア(`DECAYED_SCORE` 相当)にフォールバックして trend_score に入れる
- **Δ マイナス**(ブクマ削除でカウント減): 0 で下限クリップ
- 保持期間(例: 35日)超のスナップショットは同タスクで間引く

### ランキングの差し替え(期間で指標を分ける)

短期は「今の勢い」、長期は「結局たくさんブクマされた殿堂」を見たい。期間ごとに並べる指標を変える:

| 期間 | 対象(公開日で絞る) | 並び |
|---|---|---|
| `today` | 直近 1 日 | 伸び速度 `trend_score`(velocity) |
| `week` | 直近 7 日 | 伸び速度 `trend_score`(velocity) |
| `month` | 直近 30 日 | はてブ数 `hatena_bookmark_count`(絶対値) |
| `all`(既定) | 全期間 | はてブ数 `hatena_bookmark_count`(絶対値) |

- `today` / `week`: `ORDER BY trend_score DESC, published_at DESC`(事前計算列・索引可)
- `month` / `all`: `ORDER BY hatena_bookmark_count DESC, published_at DESC`(内部シグナルがほぼ 0 の現状、
  加重和ではなく素のはてブ数で十分・意味も明快)
- Trigger.dev の `fetch-feed-articles` からのはてブ取得で snapshot を1行 append するよう揃える

### 重み・係数の定義

- `TREND_GRAVITY`(=1.0)と velocity 窓(=6h)の定義は `features/feed/domain/popularity.ts` に集約(ADR-0014 同様、infrastructure の SQL もこの定数を参照)

## 結果

- ✅ 短期(today/week)は「今伸びている記事」が上位に出る。勢いのある新着が、累計だけ多い古株を上回る
- ✅ 長期(month/all)は素のはてブ数順で「殿堂的な人気」を見られる。期間ごとに見たいものが分かれて納得感が上がる
- ✅ trend_score を事前計算・索引化したことで、ADR-0014 の「`now()` 依存で索引不可」が解消。ランキングは単純な `ORDER BY` で高速
- ✅ velocity は `captured_at` の実時刻で Δ を取るため、cron の遅延・間引きに頑健(スケジューラ精度に依存しない)
- ⚠️ 定期取得が前提。trigger.dev タスクが止まると trend_score が stale 化する(フォールバックと監視で緩和)
- ⚠️ `article_metric_snapshots` が増える。保持期間で間引く(対象は直近記事のみなので規模は小さい)
- ⚠️ はてブ 0 の記事(自社ドメイン等)は依然 Δ=0 で実質新着順。外部シグナルが無い限界は本 ADR では解かない(別ソース追加は将来の拡張・ADR-0014 選択肢C)
- ❌ 受け入れるトレードオフ: テーブル+cron+再計算という複雑さ(単一カウント列より重い)。個人開発の運用負荷を考慮し、スケジューラは導入済みの trigger.dev に寄せて最小化する

## 関連リソース

- ADR-0014(はてブ数採用・時間減衰モデル)
- はてなブックマーク件数取得API: `https://bookmark.hatenaapis.com/count/entries`(最大50 URL/req・無認証)
- 実装予定: `db/schema/article-metric-snapshots.ts`, `features/feed/domain/popularity.ts`(velocity 式), `features/feed/application/update-article-metrics.ts`(snapshot append + trend_score 計算), `features/feed/infrastructure/drizzle-article-repository.ts`(ランキング差し替え), trigger.dev タスク定義
