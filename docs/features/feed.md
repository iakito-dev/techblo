# Feature: feed(記事フィード)

## 概要

複数企業のテックブログを集約し、新着順または人気順でカード形式に表示する。未ログインでも閲覧可能。

## ユーザーストーリー

- ソフトウェアエンジニアとして、複数の企業ブログを1箇所で見たい、なぜなら個別に巡回するのが手間だから
- ログインユーザーとして、購読中の企業の記事だけ表示したい、なぜなら興味ないジャンルを除外したいから
- ログインユーザーとして、未読の記事が分かりたい、なぜなら何を読んだか覚えていられないから

## 画面/UI

- ルート: `/`
- **既定状態(クエリなし)**: デスクトップ(md+)はセクション型フィード(新着 + カテゴリ別6棚 + イベント・コミュニティ、ADR-0035)。モバイル(<md)は既存のリスト表示(全カテゴリの新着・無限スクロール)
- **モバイルのカテゴリタブ**: 廃止した(上部クロームを1行占める割に、横スクロールで画面外に隠れるタブが多く使いにくかったため)。モバイルにはカテゴリを選ぶ入口を置かない。`?category=` 付きで来た場合(共有リンク・デスクトップの棚の「もっと見る」)だけ、チップ行にカテゴリ名のチップを出して ✕ で解除できる(`buildCategoryTabHref(params, 'latest')`。絞り込みバッジの数には含めない)
- **新着・棚の「もっと見る」**: 新着 → `/?sort=latest`(全カテゴリの新着一覧)、棚 → `/?category=<key>`
- **一覧の見出し(デスクトップ)**: `?category=` のときはカテゴリ名、`sort=latest` だけのときは「新着」、それ以外は「フィード」(`resolveFeedHeaderTitle`)。既定状態以外では見出しの上に「← トップ」。サイドバーは `?category=` のときカテゴリ行を選択中にし「フィード」は選択中にしない。`/` の一覧は最大 1680px・md 以上でコンテンツ領域の実幅に応じて1〜4列(コンテナクエリ。ADR-0035。詳細は下記「列数・件数(可変)」)
- **クエリあり時**: `?category=` / `?q=` / `?company=` / `?feed=` / `?tag=` / `?read=` / `sort` / `period` のいずれかがあれば、既存のリスト表示にフォールバック
- フォールバック条件: 棚が1つも作れない(カテゴリ分類のバックフィル前など)・全企業 OFF の場合は、既存のリスト表示にフォールバック
- レイアウト(ADR-0020 で Dewey 風シェルへ刷新。ADR-0011 の配色・テキスト主体カードは維持):
  - デスクトップ(lg+):
    - 左サイドバー(`components/layout/app-sidebar.tsx`): ロゴ + アカウント / ライブラリ(フィード・ブックマーク・お気に入り) / **カテゴリ**(セクション型フィード対応) / フィルタ(仮) / **フォルダ = 購読企業**(企業ファビコン `CompanyFavicon` + 実件数、クリックで `/?company=slug` 絞り込み・折りたたみ) / 下部ユーティリティ(設定・キーボードショートカット一覧)
    - トップバー(`components/layout/feed-topbar.tsx`, sticky): 記事検索(`?q=`、⌘K でフォーカス。ADR-0022)+ 更新 + オーバーフロー(仮)
    - 見出し操作行(`FeedHeader`): タイトル + 並び替え(新着順 / 人気順。集計期間は独立 select ではなく**人気順チップに統合した分割ボタン**「人気順 ・期間 ▾」で、期間部分は常時表示)+ 表示切替/選択(仮)
    - 本体: `feed-grid` ユーティリティ(auto-fill grid、`--feed-card-min` 基準で 1〜4 カラム可変)
  - モバイル(<md): ロゴ無しの専用ヘッダー(`MobileFeedControls`)。①検索バー(`?q=`)+ 絞り込みアイコン(44px 角丸・適用時はアクセント塗り+適用数バッジ)の1行 / ②適用中フィルタ・カテゴリ・`人気順` の削除可能チップ行(1つ以上のときだけ。`未読のみ`/`24時間以内`/各企業/カテゴリ/`人気順` を ✕ で個別解除)。すべて絞り込みボトムシート(`FeedFilterSheet`)とチップから操作し、フィルタ状態は `useFeedFilters`(URL)を唯一の真実の源にする。下部タブナビ(`MobileNav`)
    - **件数行・並び替えトグルは廃止**(旧③)。件数はシートのフッター(`N件の記事を表示`)と重複し、並び替えはシートの「並び替え」セクションへ移した。上部クロームが1行ぶん短くなり、その分リストが上に来る。既定(新着順)はチップを出さず、`人気順` のときだけチップで状態を見せる(✕ で新着順へ戻る)。人気順はフィルタではないので絞り込みバッジの適用数には含めない
    - この廃止により、モバイル件数表示のためのカテゴリ別集計(`getFeedFilterCategoryCounts`)も不要になったため削除した(フィードページの `Promise.all` から1クエリ減る)。下位の読み取り(`getCategoryCounts` / `countByCategory` / `countByCategory` リポジトリ実装)はカテゴリタブへの件数表示などに再利用できるため残してある
  - タブレット(md〜lg): 上部1行ツールバー(`FeedControls`: 検索・企業フィルタ・新着/人気・期間)+ 下部タブナビ。ロゴ + アカウントは `Header`(md〜lg のみ表示)
  - 企業フィルタは `?company=slug`(モバイルはシートで複数選択、タブレットは Dropdown 単一選択)。デスクトップはサイドバーのフォルダが同じ `?company` を操作
  - 並び替え(`?sort`)と期間(`?period`)は**直交**する。period は「公開日のウィンドウ」フィルタで sort に依らず常に適用し、sort は並び順のみを決める(新着順 × 24時間 が成立。並び替えの変更で件数は不変)
  - 並び替え/期間は直操作で URL を更新(後述の再マウント回避)
  - ログイン導線はヘッダーに置かず、設定タブ最上部の登録カードへ集約(docs/features/auth.md)
  - タグ欄は廃止しカテゴリ欄に置き換えた。`?tag=` の絞り込みはカード/記事ページのタグバッジから使える(ADR-0027)。フォルダ等の未実装枠はプレースホルダのまま

### 状態のバリエーション

- 初回表示: 動的な購読/フィルタ/最新DB を反映する `SubscribedFeed` が解決するまで `FeedGridSkeleton` を出す(PPR の静的シェルに焼き込まれるのでリロード時も即フラッシュ)。以前は既定フィードの実コンテンツをフォールバックにしていたが、「古い記事→新しい記事」の内容差し替えが体感ノイズになったため skeleton に戻した(ADR-0024 が ADR-0019 を supersede)
- 入力の角丸はアプリ共通で 14px(`rounded-md`)に揃える。共通 Input(デスクトップ検索・設定フォーム)と絞り込みシートの企業検索が 14px なので、モバイル検索バーの pill(`rounded-pill`)だけが外れ値だった。塗り・枠・影といった外枠の表現は各コンポーネントの既存のまま変えない(角丸だけ揃える)。絞り込みボタン(44px)も同じ 14px にする(完全な円だと検索バーの隣で独立した丸い島に見える)。ヘッダーのアイコンは 18px に統一する(虫眼鏡 16px / 絞り込み 20px で不揃いだった)。検索オーバーレイ(`MobileSearchOverlay`)と skeleton(`MobileFeedHeaderSkeleton`)も同じ寸法に揃える(skeleton がズレると読み込み前後で検索窓の見え方が変わる)
- モバイル(<md)の左右ガターは `shared/layout.ts` の `MOBILE_GUTTER_CLASS`(20px / 430px 以上は 24px)に集約する。16px だと 440pt 級の端末で 18px の太字タイトルが画面端まで詰まって窮屈に見え、一方で小型端末(375pt)まで 24px にすると1行の文字数が減るため画面幅で段を付ける。sticky ヘッダー(検索行・チップ行)とリスト本体・棚・イベント・保存記事・設定・ロゴ帯が同じ定数を使う(ズレるとカードの上罫と検索バーの左端が揃わない)。md 以上(`md:px-6` / `lg:px-8`)は各画面が最大幅に応じて付ける
- モバイル(<md)の検索行の左にはロゴマーク(`LogoMark`: ワードマーク無しの 2×2 ドット)を置く。フィードは共通 Header(ロゴ帯)を隠すため、これが無いと他タブ(ロゴ帯あり)から入った瞬間にロゴが消える。既にホームなので遷移先を持たない装飾(aria-hidden)として置き、行の高さは変えない
- 絞り込み中のタブ/履歴タイトル(`feedPageTitle`): 検索語があれば「語」の検索結果、無ければタグ指定で #タグ の記事(検索優先 → タグ → 企業 → 人気順の順、40 文字で切る)。企業を 1 社だけ選んでいれば(`?company=slug`、複数選択は対象外)「企業名 の記事」、人気順(`?sort=popular`)のみなら「人気の記事」。それ以外は既定タイトルのまま。複数タブやブラウザ履歴で検索・タグ違いを見分けるため。canonical・noindex の扱いは変えない
- `(app)` 配下の `<main>` ランドマークは `app/(app)/layout.tsx` の `#main-content` に一本化する(スキップリンクの着地点を兼ねる)。各 page は `<main>` を持たない(入れ子の main は無効なため、記事ページ・その loading も `div`)。以前はフィード・保存・履歴・設定に main が無く、スクリーンリーダーの「メインへ移動」が効かなかった
- サイドバーの折りたたみ見出し(企業 / マイフィード)は `outline-none` のままだとキーボードで Tab を当てても焦点が見えなかったため、`focus-visible:ring-2 focus-visible:ring-accent` を付ける(マウス操作では出ない)
- ルート遷移中(`app/(app)/loading.tsx`)は上部クロームも skeleton で出す(`feed-chrome-skeleton.tsx`: モバイル=検索/絞り込みヘッダー、タブレット=1行ツールバー枠、デスクトップ=上部バー + 見出し行)。モバイルのフィードは共通 Header(ロゴ帯)を隠して `MobileFeedControls` が上部を担うため、loading 側に枠が無いと「遷移中は上部が空 → 解決時に検索行が生えてカードが押し下がる」表示差になる。モバイル skeleton は検索行 + タブ行ぶんの高さ(`h-11` + `pb-2.5` + 下罫)を出す(タブのラベル自体は `?category=` 依存の選択下線を誤って見せないため出さない)
- ツールバーは既定状態(新着・全企業)の `DefaultFeedControls` をフォールバックとして静的プリレンダし、購読スコープ版がストリームで上書き(ライブ版は useSearchParams を読むためフォールバック位置に置けない。操作は FeedNav context 経由で即機能。並び替えタブが即表示される利点があり、記事のような内容差し替えは起きないため据え置き)
- データあり(通常表示)
- 全企業オフ(空状態 → 「購読を有効にしてください」)
- 記事未取り込み(空状態 → 定期取得中であることを表示)
- 人気順 × 狭い期間(今日/今週/今月)で 0 件(空状態 → 「全期間で見る」で期間を広げる導線。`FeedPeriodEmptyState`)
- 検索(`?q=`)で 0 件(空状態 → 検索語のエコーバック + 「検索をクリア」導線。`FeedSearchEmptyState`。期間空状態より優先)
- 取得エラー(リトライボタン)

### カード要素(上罫・テキスト主体、ADR-0035)

- 面・影・角丸なし。上端に1.5px の hairline(`border-border-default` = `--color-rule` #e9e6e0)。hover で罫とタイトルが teal(accent)に(太さは不変)。タイトルリンクのキーボードフォーカス時のみ罫を 3px teal に太くしタイトルに下線
  - 罫は当初 ink(本文と同じ #1f2126)だったが、本文と同じ濃さの線が1画面に何本も走ると線がタイトルと competing して一覧が重く見えたため hairline まで落とした。「1本ずつのまとまり」に必要なのは地色との分離で、本文と同じ濃さは要らない。**「ここから次の記事」の目印はファビコン + 企業名の見出し行が担う**(そのためカードのファビコンだけ 20px にしている)
  - 罫を消す案(余白だけで切る)も検討したが、線を完全に捨てると抜粋の行数で境界の見え方が変わるため hairline を残した。skeleton の上罫も同じ `border-border-default` に揃える(実カードより濃いと読み込み中の方が重く見えるため)
- メタ行(見出し行): 左に 企業ファビコン(`CompanyFavicon` を `size={20}` で。既定の 16px は他の面(サイドバー・絞り込みシート・設定)のまま) + 企業名、**右端に投稿日時**(相対表記: 3時間前)。日時は「いつの記事か」をカードを読む前に判断する情報なので、視線が最初に通る見出し行の右端に置く(以前はフッター左)。はてブ数も同じ「記事のメタ」なので日時の隣に並べる(人気順のときだけ表示)。`RelativeTime` は初期から相対表記をサーバーHTMLに焼く(記事カードは動的経路のみで静的プリレンダされないため now() を使える。ADR-0024)
- タイトル(18px、3行クランプ、クリックで外部ブログへ別タブ遷移)
- サブテキスト: AI要約の `overview`(無ければ RSS抜粋)2行
- AI バッジ(teal の輪郭バッジ「AI」)は**廃止**した。判定(`lib/categories/ai-related.ts`)は「表示用タグのいずれかが AI 関連語に完全一致するか」だったが、(1) 判定はタグ全件を見るのにカードの表示は先頭3件なので「バッジは付くのに AI 系タグが1つも見えない」カードが出る、(2) 完全一致なので AI の記事でもタグの語が違えば付かない、(3) `article_summaries.category`(ADR-0034 の職能軸)と判定基準が二重管理、(4) カテゴリタブで「AI・機械学習」を選択中は原理上ほぼ全件に付いて無意味 — の4点で、付く/付かないの差が情報として機能していなかった。タグ行に `生成AI` / `機械学習` 等が出るのでバッジは粗い重複でもある。カテゴリで絞る手段はデスクトップのサイドバー・棚が担う
- 最終行: **AI要約のタグ + 保存系アクションを同じ行に置き高さを揃える**。タグは塗りなしの輪郭バッジ(`border-border-default` + `rounded-full`)で最大3個・1行表示、1行に収まらない分はバッジ単位で隠す(折り返して枠外へ追い出す。半端に切れたバッジは出さない)。各バッジは `/?tag=<生タグ>` へのリンク(hover/focus は輪郭と文字だけ teal・塗りなし。見た目の高さは変えず `::before` で当たり判定だけ上下に広げる)(`ArticleCard` の `tags`。app層から `summary?.tags` を注入。feedは ai-summary を import しない)。タグが無い記事(要約未生成)はボタンだけが右端に出る
  - 以前はタグ行と「日時 + 保存ボタン」のフッター行が別々で、44px のボタンを含む行がまるごと1本積まれカード下部だけが間延びしていた。日時を見出し行へ移したことでこの行に残るのはタグとボタンだけになり、統合して 1 枚あたり約 36px 縮んだ
- 保存アクション: ポインタ環境は hover/focus-within で表示、タッチ環境は常時。はてブ数は既定で出さず、人気順(`sort=popular`)の一覧でだけ見出し行に表示する(Newsreader セリフ数字、0は非表示。`ArticleCard` の `showHatenaCount`)
- OGP画像・炎アイコンは廃止
- 読了時間・未読インジケータ・カウント表示は将来対応(現状は非表示)
- モバイルの情報密度(`FEED_GAP_CLASS`): カード間の行間はモバイル 24px / md+ 40px。カード内もモバイルだけ詰める(メタ行下 10px・最終行上 12px、md+ は 12px・16px)。保存アクションは 44px の当たり判定を維持したまま `-my-2.5` の負マージンでフッターの行高から切り離す(44px をそのまま積むと 1 枚あたり 20px が余白になり、1 画面に入る記事数が減る)。行間は一覧・棚・スケルトンで同じ定数を使い、読み込み中と読み込み後でリズムがずれないようにする
- タッチ操作: カードと保存アクションに `touch-manipulation`(iOS のダブルタップズーム待ち=タップ遅延を切る)。タッチ端末は hover が無いため、押した手応えは `active`(押下中の塗り + 押し込み)で返す

### 企業ページ(/companies、ADR-0030)

SEO の主力導線。「企業名 × 技術ブログ」のロングテール検索の着地先。

- `/companies` — 全企業へのリンク集約ハブ(クローラビリティ + 「技術ブログ 一覧」のインデックス対象)。`getCompanies()` をカード一覧で描画
- `/companies/[slug]` — 企業ごとの記事まとめ。企業名 + 紹介文 + 公式ブログ導線 + その企業の記事グリッド(初期30件 SSR)。記事一覧は**購読スコープ非依存**(`getCompanyArticles`)で、ログイン購読に関わらず当該企業の全記事を見せる
- カード描画は `CompanyArticleGrid`(フィードの `FeedRow` を共用: カード + 保存アクション + AI要約)。初期30件は SSR(クローラ向け)で、続きは Server Action `loadMoreCompanyArticles`(`app/_composition/article/company-articles-actions.ts`。入力は Zod 検証・認証不要・購読スコープ非依存)が同じ30件単位(`COMPANY_PAGE_SIZE`)で返し末尾に追記する。自動読み込み + 「もっと読む」ボタンは `LoadMoreTrigger`(企業ページ専用)
- `/companies` のハブは企業名のインクリメンタル絞り込み(`CompaniesFilter`)付き。カードは SSR で全件 HTML に出したまま、クライアントで非一致の `li` を `hidden` にするだけ(リンクを HTML から消さない)。一致0件は空状態メッセージ
- メタ: title「〇〇のテックブログ新着記事まとめ」/ 自己参照 canonical / OG。JSON-LD は `CollectionPage` + `BreadcrumbList`(ハブは企業 `ItemList`)。`lib/seo.ts` のビルダ
- 内部リンク: 記事ページ `/a/[id]` の企業名 → `/companies/[slug]`。sitemap にハブと各企業ページを追加

## データモデル(該当テーブル)

- `articles` — 記事本体
- `companies` — 企業マスタ(購読対象の元データ)
- `subscriptions` — ユーザーごとの購読設定(ログイン時のフィルタリング)
- `article_views` — 表示数のカウント(人気順用)
- `bookmarks`, `favorites` — カードのアクション状態判定用

## API / Server Action

> シグネチャは公開 API の形を示す。実装は application 層の usecase、DB アクセスは infrastructure 層の Repository。`web/queries.ts` は composition root。
> queries は composition root で Result を解いて RSC が扱いやすい値を返し、想定エラーは throw して `error.tsx` / `global-error.tsx` に委ねる。actions は Result のまま返す。

```ts
// features/feed/web/queries.ts(RSC から呼ぶ)
getFeedSections(companyIds?: string[]): Promise<FeedSection[]>  // セクション型フィード取得('use cache' + cacheTag(feed) + cacheLife('minutes'))
getSectionsPageData(): Promise<{ sections; events; hasMore }>   // app 合成層で使用(新着+セクション+イベント)
getFeed(input?: ListFeedInput): Promise<FeedPage>            // sort/page/limit/companyIds で取得('use cache'。FeedPage は totalPages ではなく hasMore を返す)
getReadFilteredFeed(userId, mode, input?): Promise<FeedPage> // 未読/既読フィルタ済み(reads と EXISTS/NOT EXISTS)。per-user キャッシュ tag=[feed,userReads](ADR-0021)
getCompanies(): Promise<CompanyWithCount[]>                  // 企業一覧 + 記事数('use cache' / ADR-0016)
getSidebarCompanies(): Promise<CompanyWithCount[]>          // サイドバー/既定ツールバー用。throw せず失敗時は空配列('use cache')
getCompanyBySlug(slug): Promise<CompanyDetailDto | null>    // 企業ページ(/companies/[slug])用。slug で1社+紹介文('use cache' tag=[companies,feed]。ADR-0030)
getSitemapCompanies(): Promise<{ slug }[]>                   // sitemap 用の全企業 slug('use cache')
getArticleById(id: string): Promise<ArticleCard | null>     // 単発参照(OGP プレースホルダー生成等)
getRelatedArticles(id: string): Promise<ArticleCard[]>      // 記事ページの関連記事(最大6件。'use cache: remote' tag=article(id) days(ADR-0047)、失敗時は空+minutes。ADR-0037)

// app/_composition/article/feed-load-more.tsx(app 層の合成点・RSC から呼ぶ。ADR-0013)
getCompanyArticles({ slug, page, limit }): Promise<{ items: ComposedArticle[]; hasMore; isGuest }>
//   企業ページ用。購読スコープ非依存でその企業の公開記事を新着順に。ログイン時のみ保存状態を上乗せ(ADR-0030)
searchFeed(input: ListFeedInput): Promise<FeedPage>          // 検索(?q=)付きフィード。'use cache' なし(q はバリアント非有界のためキャッシュをバイパス。既読フィルタは input.readFilter で併用。ADR-0022)

// features/feed/web/actions.ts(Server Action)
trackArticleView(input: { articleId: string }): Promise<Result<void, FeedError>>
```

## ビジネスルール

- セクション型フィード(既定状態): 新着 → カテゴリ別6棚(各2行+もっと見る) → イベント・コミュニティ(最新6件)。列数・件数はコンテンツ領域の実幅に応じて可変(ADR-0035。下記「列数・件数(可変)」)
- 新着に出た記事は棚に出さない(重複禁止)。棚のカテゴリ分類は `article_summaries.category` で判定し、未分類(null)・失敗(status=failed)の記事は棚に出さない
- 列数・件数(可変、ADR-0035): サーバはビューポートを知らない(ADR-0019)ため列数も知らない。`/` と `/?category=` などの一覧・トップの新着・棚は CSS コンテナクエリでコンテンツ領域(最大 1680px)の実幅に応じて 1〜4 列に可変にする(1360px 以上=4列 / 900px 以上=3列 / 600px 以上=2列 / それ未満=1列。列間32px・行間は md+ 40px / モバイル 24px)。棚は2行ぶん出す(3列=6件 / 4列=8件 / 2列=4件)。1行だとノート PC 幅(3列)で3件しか並ばず、見出しと「もっと見る」の割に中身が薄かった。新着(3行)より浅く保つのは、棚は入口で深く読むのは「もっと見る」の一覧という役割分担を維持するため。サーバは常に最大件数(新着 `LATEST_COUNT`=12 件・棚 `SHELF_ITEM_COUNT`=8 件)を取得・描画し、実列数に満たない分(行が欠ける分)は `app/globals.css` の `feed-latest-cutoff` / `feed-shelf-cutoff`(コンテナクエリで nth-child を `display:none`)で隠す。イベントの1行リストは列グリッド化せず幅によらず6件のまま。新着との重複除外は取得した新着12件すべてが対象のままなので、狭い幅で新着の後半(画面に出ていない7〜12件目など)に該当した記事は棚・イベントにも出てこない(仕様。`features/feed/application/list-sections.ts`)
- `?category=<key>` 絞り込み: article_summaries の category 完全一致でフィルタ(公開記事のみ)。他フィルタと併用可。不正キーは無視
- 未ログイン時: 全企業の記事を表示(購読設定無視)
- ログイン時: `subscriptions.enabled=true` の企業のみ表示
- 企業フィルタ(`?company=slug`): 購読とは独立した一時的なビューフィルタ。単一選択で、未選択なら「すべて」。企業一覧は購読スコープ内の企業(未ログインは全社)。スコープ外 slug は無視。設定(購読)は変更しない
- タグフィルタ(`?tag=`、ADR-0027 / ADR-0032): AI生成の表示タグ(`article_summaries.tags`)で公開記事を絞る(Repository が `article_summaries` を EXISTS 参照)。サイドバーの固定キュレーション UI は廃止。入口は記事カード最終行と記事ページ AI要約のタグバッジ(`/?tag=<encodeURIComponent(タグ)>` への `next/link`、`prefetch={false}`)で、URL の `?tag=` から直接も使える(単一の真実源は `lib/tags/curated.ts`)。適用中はデスクトップ見出しが「#タグ名」になり「← トップ」で解除、モバイルはチップ行に「タグ: xxx ✕」(✕ は `tag` だけ削除。絞り込みバッジの件数には含めない)。タブレット(md〜lg)のツールバーは未対応。`?tag=` は canonical ラベルで、Repository が `expandTag()` で類義語群へ展開し各タグの `@>` 包含を OR で突き合わせる(例: `AI・LLM` = 生成AI/AI/LLM/機械学習)。完全一致の OR なので `tags` の GIN が効く。正規化検索基盤ではないためグループ外の表記ゆれ・キュレーション外タグは取りこぼす(網羅は `?q=` が担う)。公開記事のみ対象でマイフィードはマージしない。他フィルタ(既読/期間/並び替え)と併用可
- 記事検索(`?q=`、ADR-0022): title/description の ILIKE 部分一致(pg_trgm GIN。マイグレーション 0004)。他のフィルタ(企業/既読/期間/並び替え)と AND で併用可能
  - 入力は debounce(300ms)で URL へ commit(`router.replace`、履歴を汚さない)。IME 変換中は commit しない(`use-feed-search.ts` / `feed-search-box.tsx`)
  - Enter / 検索キー(`enterKeyHint="search"`)で debounce を待たず即 commit(`useFeedSearch.commitNow`)。スマホのインライン検索/タブレットツールバーは入力を blur してキーボードを閉じ、検索オーバーレイは閉じて結果フィードへ戻す
  - 検索履歴(最近の検索): 明示確定(Enter / 検索キー / 履歴の選択)した語だけを端末内の localStorage(`techblo.search.history`)に最大8件保存する。debounce の途中入力は記録しない。trim・NFKC+小文字で同一視して重複は先頭へ移動、1語100文字上限。入力が空のときだけ、モバイルは検索オーバーレイ内のリスト、デスクトップは検索ボックス直下のポップオーバー(combobox/listbox、↑↓/Enter/Escape)に出し、個別削除と「すべて消去」ができる。localStorage が使えない環境では履歴なしで動く。静的シェル用 `DefaultFeedSearchBox` は履歴を読まない(純粋関数 `search-history.ts` / hook `use-search-history.ts`)
  - モバイル/タブレットの検索入力は 16px(`text-base`、lg+ のみ `text-sm`)。iOS のフォーカス時自動ズーム(16px 未満で発火)を防ぐ
  - デスクトップはトップバー(⌘K / Ctrl+K でフォーカス、Escape でクリア)、lg 未満は `FeedControls` の searchSlot に配置
  - 検索語の正規化(trim・100文字上限・空→検索なし)は application 層、LIKE メタ文字エスケープは infrastructure 層(`escape-like.ts`)
  - 検索結果はフィードキャッシュを通さない(`searchFeed`)。「もっと読む」も `query` を引き継ぐ
- 削除済み記事(`articles.deleted_at` not null)は表示しない
- 人気順: 集計期間(`?period=today|week|month|all`、既定 all)で切り替え。いずれもその期間に公開された記事に絞り、**期間ごとに並べる指標を変える**(ADR-0018)
  - `today` / `week`(直近 1/7 日・短期): 伸び速度(velocity)降順。`trend_score = (Δはてブ_6h + 1) / (経過時間[h] + 2)^1.0`。累計ではなく「今伸びている」を見る。事前計算列 `articles.trend_score` で並べる(now() 非依存・索引可)
    - 定期取得タスク(trigger.dev, 6h おき)が `article_metric_snapshots` に時系列を貯め、窓(6h)前との差分から trend_score を再計算する
    - コールドスタート(公開直後で窓ぶんのスナップショットが無い)は減衰つき累計 `(view*1 + bookmark*2 + favorite*3 + hatena*4 + 1) / (経過時間[h] + 2)^1.5` にフォールバック
  - `month` / `all`(直近 30 日 / 全期間・長期): 単純なはてブ数 `hatena_bookmark_count` 降順(殿堂的な人気)。同点は新着順
  - はてなブックマーク数(外部シグナル)を主成分にする(ADR-0014)。重み・gravity・velocity 窓は `domain/popularity.ts` が唯一の定義
  - 期間は対象集合を絞るため `count`(ページ数算出)も同じフィルタで数える
  - 集計期間は人気順のサブ状態。**並び替えを切り替えても `?period` は保持**し、人気順へ戻ったとき直前の期間で復元する(人気順チップに期間を常時表示する UI の前提。`useFeedSort`)。0 件時は次項の導線で回復する
  - `?sort=` の正規化は `parseFeedSort`(domain。不正値・未指定は `latest`)に集約する。モバイルはシートの「並び替え」セクションで選び、`apply()` が他のフィルタと 1 回の遷移でまとめて commit する(`latest` は URL から消す)
  - 人気順 × 狭い期間で 0 件のときは取得を促さず、**全期間へ広げる導線**(`FeedPeriodEmptyState`)を出す
- ページング: 「もっと読む」ボタンで追記(ADR-0013 追補)。初期ページは RSC が SSR、続きは `loadMoreFeed` Server Action がサーバ側で合成したカード(保存系アクション込み)を返し末尾に追記。内部はオフセット(page N)のまま
- ページサイズ: 固定 12 件(`INITIAL_PAGE_SIZE`)。以前は端末別だったが headers 依存で静的プリレンダを妨げるため固定化(ADR-0013 追補 / ADR-0019)。usecase 上限50件
- 次ページ判定: 総件数を数えず `limit + 1` 取得の余りで `hasMore` を返す(count(*) 廃止。ADR-0013 追補)
- 公開フィードは `'use cache'` + `cacheTag('feed')` でキャッシュし、`cacheLife('minutes')` で再検証
- 企業一覧・ユーザー単位データ(bookmark/favorite/購読)も `'use cache'` 化し、操作 Action はユーザー単位タグの `updateTag` で無効化する(`revalidatePath('/')` は使わない=ゲスト共通の feed キャッシュを巻き添えにしない)。ADR-0016
- ソート/期間/企業の切替は `FeedList` を再マウントせず、URL 由来の変化を検知して内部 state を page=1 へ同期する(カード DOM を保持)。切替先は `FeedControls` のセグメント/チップのホバー/フォーカスで `router.prefetch` 済み。ADR-0016
- 新規取得: Trigger.dev の `fetch-feed-articles` タスクが1時間おきに全企業の RSS を取得する。取得後に直近記事のはてなブックマーク数も更新し、人気順の材料を揃える。ローカル検証は `scripts/ingest.ts` で全企業を取得する。トップバーの更新ボタン(`RefreshButton` → `refreshFeed` Server Action)からオンデマンド取得もできる。Server Action は外部から直接呼べるため、直近の取込試行(cron 含む、企業の `last_fetched_at` / `last_error_at` の最大)から 5 分以内はクロールせず `skipped` を返す(`domain/refresh-cooldown.ts`)
- 日付の TZ 補正: `companies.feedTimezone` を設定したフィードは、宣言 TZ を無視して `pubDate` の壁時計をその TZ で解釈する(TZ 欠落/誤記フィード対応。メルカリが実例)。取込時に「now+10分」を超えて未来の `publishedAt` は取込時刻にクランプし警告する(誤設定でも「たった今」固定を防ぐ)。詳細は ADR-0025 / `docs/guides/adding-a-company.md`
- 未読/既読フィルタ(`?read=unread|read`、既定 all): 記事ページを開くと既読化(ログイン=DB / ゲスト=localStorage)。フィルタは feed クエリの `EXISTS`/`NOT EXISTS` で絞る(全件既読 ID を持たない)。ログインはサーバー絞り込み、ゲストは `FeedList` がクライアント側 hide。未読バッジは出さない。詳細は ADR-0021 / `docs/features/reads.md`
- モバイルドック(<md): `MobileFeedDock` は `MobileNav` と共有 `bottom-chrome` Context を購読し、下スクロールで両者を同じ距離だけ一体退避する。企業/既読/期間フィルタ適用中(件数バッジ表示中)は退避させない。フィード末尾は `--mobile-nav-h` + ドック高ぶんの余白を確保する。詳細は ADR-0023。

## キーボードショートカット

デスクトップ向けのグローバルショートカット。`components/layout/keyboard-shortcuts.tsx`(Provider + 一覧ダイアログ)を `app/(app)/layout.tsx` にマウントし、キー判定の純粋ロジックは `components/layout/keyboard-shortcut-map.ts`(unit test 付き)に置く。

| キー | 動作 |
|---|---|
| `j` / `k` | 次 / 前の記事カードのタイトルリンクへフォーカス移動(DOM 順、`display:none` のカードは除外、`scrollIntoView({ block: 'nearest' })`) |
| `Enter` | 標準のリンク遷移(記事ページ `/a/[id]`) |
| `o` | フォーカス中カード(無ければ記事ページの主記事)の元記事を新規タブで開く(`noopener`、http(s) のみ) |
| `b` / `f` | あとで読む / お気に入りを切り替え(既存の保存ボタンを `click()`。optimistic・ゲスト保存・失敗時ロールバックは既存ロジックのまま) |
| `/` | 検索ボックスへフォーカス(⌘K と同じ対象。検索ボックスが無いページでは何もしない) |
| `g` → `h` / `b` / `f` / `s` | 1 秒以内の 2 打鍵で `/` / `/bookmarks` / `/favorites` / `/settings` へ遷移 |
| `g` → `t` | 1 秒以内の 2 打鍵でページ先頭へスクロール(`prefers-reduced-motion` 時は即時) |
| `?` | ショートカット一覧ダイアログを開閉(`Esc` でも閉じる)。サイドバー下部の「キーボードショートカット」からも開ける |

- 入力中(input / textarea / select / contenteditable)、IME 変換中(`isComposing`)、⌘/Ctrl/Alt 付きでは発火しない。ダイアログ表示中は `?` 以外を無視する。
- 対象の目印は data 属性: カード `data-article-card` + `data-article-url`、タイトルリンク `data-article-link`、保存ボタン `data-shortcut-action="bookmark|favorite"`、記事ページの主記事 `data-article-main`、検索ボックス `data-feed-search`。
- lg 未満では UI(サイドバー行)を出さないが、キー自体は動作する。

## エッジケース

- RSS抜粋が空 → タイトルのみ表示
- 全企業の購読がオフ → 「すべての企業の購読がオフになっています」と購読設定への導線表示
- ネットワークエラー → リトライUI

> カードは OGP 画像を使わない(ADR-0011)ため、画像取得失敗の考慮は不要。
> プレースホルダー生成 API `/api/og/[id]` は残存するがフィードカードからは参照しない。

## メトリクス

PostHog のイベント(一覧と規約は [observability.md §4](../architecture/observability.md)):

| イベント | プロパティ | 発火 |
|---|---|---|
| `article_clicked` | articleId, companyId, companySlug, source(`feed` / `event_list` / `related`) | 記事ページへのリンク(`features/feed/web/components/article-link.tsx` の `ArticleLink`)。`ArticleCard` / `FeedEventRow` / `RelatedArticles` が使う |
| `article_source_opened` | articleId, companyId, companySlug | 記事ページの「元記事を開く」(`ArticleSourceLink`) |

記事ページの閲覧そのものは `$pageview`(`/a/[id]`)で取れる。`ArticleCard` DTO の `company.id` はこの計測のために持つ。

- 各社の記事表示回数
- ブックマーク/お気に入り率(表示数比)
- スクロール深度(PostHog)
- 「すべて見る」「ブックマーク」「お気に入り」のクリック率

## 関連

- ADR-0034 (記事カテゴリの定義と分類)
- ADR-0035 (セクション型フィードとエディトリアルカード)
- ADR-0016 (ユーザー単位キャッシュと再マウント回避 — 切替/初回の往復削減)
- ADR-0013 (オフセットページネーション + フィードキャッシュ)
- ADR-0011 (Base44参照デザインへの刷新: テキスト主体カード。配色は現行トークンで更新済み。一部 ADR-0035 で Superseded)
- ADR-0004 (OGP画像のホットリンク — ADR-0011 で Superseded)
- ADR-0005 (MVP除外: AI要約)
- ADR-0022 (記事検索: ILIKE + pg_trgm、キャッシュバイパス)
- ADR-0023 (モバイルのフィルタ/ソートドックと bottom chrome の一体退避)
- 機能: subscriptions(購読設定のフィルタ元)

## 実装状況(記事ページ)

カードとイベント行のタイトルは記事ページ `/a/[id]` への内部リンク(`next/link`)。X / Threads と同じ「タイムライン → 個別ページ」の形で、通常クリックで遷移、⌘/Ctrl/Shift+クリックは記事ページを新規タブで開く(ADR-0036)。元記事へはページ内の「元記事を開く」から。
- `app/(app)/a/[id]/page.tsx`: 共有リンクの着地先と一覧からの遷移先を兼ねる。シェル(Header / Sidebar / MobileNav)は `(app)/layout.tsx` が保持するため、遷移で差し替わるのはコンテンツ領域だけ。
- 中身は 上罫(1.5px hairline)→ 見出し行(企業ファビコン 20px + 企業名(企業ページへのリンク)+ 著者 / 右端に相対日時)→ タイトル → AI要約(RSS 抜粋は要約が無い時だけ、200字)→ 元記事ブロック(プレビュー画像は OGP がある時だけ。画像全体が元記事へのリンク。+ 遷移先ドメイン)→ アクション行(保存・お気に入り・共有のアイコン + 右端に「元記事を開く」)→ 関連記事。xl 以上は2カラム(`max-w-[66rem]`、本文 | 18rem の右レール)で、右レール(`<aside>`)に元記事ブロック・アクション行(「元記事を開く」を幅いっぱいで先頭、アイコンはその下)・関連記事を置く。DOM は1つで並びは CSS のみ、xl 未満は従来の1カラム。
- デザインは一覧のカード(ADR-0035)を「1枚開いた」続きに見せる: カードと同じ上罫・見出し行・字間(tracking -0.015em)を使い、面・影・角丸・ブランド色は使わない。画像はカードが持たない要素なのでタイトル直下ではなく本文の後ろ(X のリンクカードの位置)に置く。OGP が無い記事は自前生成カードを出さずドメイン行だけにする(タイトルの繰り返しが面を占有するため。共有メタデータ・JSON-LD のフォールバック画像はそのまま)。「元記事を開く」はページ唯一の主アクションで、ink の塗り(`bg-primary`。teal の塗りは使わない)。AI要約のタグはカードの AI タグと同じ輪郭のみのバッジで、同じく `?tag=` へのリンク。
- 戻る導線は `ArticleBackLink`。履歴があれば `router.back()`(一覧はルーターキャッシュから復帰し、スクロール位置もブラウザが復元する)。共有リンクで直接開いた場合だけ `/` への通常リンクになる。<lg は sticky な共有 Header がロゴの代わりにこれを出し(どこまでスクロールしても戻れる)、本文側の戻る行は lg+ だけに出す。
- モバイル(<lg)は**右スワイプでも戻る**(`MobileSwipeNavigation`)。主要4画面のタブ間スワイプと同じ物理で、記事ページだけ行き先を「隣のタブ」ではなく「戻る」に割り当てる。左スワイプには何も割り当てない(進む先が無いため)。戻り先の決め方は `ArticleBackLink` と同じ規則。
- タブ間/戻るスワイプの物理(`mobile-swipe-navigation.tsx`): 行き先がある方向は指に 1:1 で追従し、行き先が無い方向(端のタブ・記事ページの左)だけ 0.18 倍の抵抗をかける。追従量は方向だけで決め(`hasSwipeDestination`)、距離しきい値で途中から追従量が変わって画面が跳ねることはない。指を離した時は、画面幅の 30% 以上動かしたか、32px 以上かつ直近 100ms の速度が 0.35px/ms 以上のフリックなら遷移、逆方向へ 0.2px/ms 以上で戻しながら離したら取り消す(`shouldCommitSwipe`)。画面外へ抜けるアニメーションは残り距離に比例(110〜240ms、`exitDurationMs`)。タブ間スワイプはドラッグを始めた時点で隣のタブを `router.prefetch(href, { kind: 'full' })` し、離した後の中身の表示を早める。縦寄りの指の動きは除外する。
- タブ間/戻るスワイプは、横スクロール領域(適用中フィルタのチップ行など、overflow-x が auto/scroll で実際にはみ出している要素)の中で始まった指では発火しない(その領域の横スクロールを優先する)。`touchcancel`(iOS の端スワイプ = ブラウザの戻る に奪われた時など)は遷移せず引っ張った分を戻すだけ。画面の左右端 24px 以内で始まった指はアプリ側では扱わない(iOS / Android の端スワイプ = ブラウザ・OS の戻る/進む に任せる。アプリも本文を動かすと、ブラウザが動かす画面全体と二重にずれる)。
- チラつき対策(ADR-0036):
  - 記事本体・AI要約はユーザー非依存で `'use cache'`。ページは PPR(`◐`)として静的シェルをプリレンダし、カードの `Link` 既定 prefetch(ビューポートに入った分)でシェルを先読みする。
  - 保存状態(ユーザー依存)だけ別の Suspense 境界(`ArticleDetailActions`)に隔離し、本文の表示をユーザー取得で待たせない。
  - `loading.tsx` と本文の Suspense fallback は同じ `ArticleDetailSkeleton`(実レイアウトと同じ位置・高さ。実物と同じ2カラム構造で、左が 上罫 → 見出し行 → タイトル → AI要約、右(aside 相当)が 画像 → ドメイン → アクション行。xl 以上のアクション行は「幅いっぱいのボタン枠 → アイコン3つ」。デザインを変えたら必ず追従させる)。これが無いと `(app)/loading.tsx` のフィード用 skeleton が出て、遷移のたびに一覧の skeleton が一瞬見える。
- データ取得(ADR-0042): 本文はリクエスト時に描画されるため、記事(`loadArticle`)・AI要約(`getSummaryByArticleId`)・関連記事は `'use cache: remote'`(Vercel Runtime Cache)で引く。記事と要約は記事タグ + `cacheLife('days')`(要約 null は `'hours'`)で、cron の `/api/revalidate` による記事タグ無効化で更新を反映する(ADR-0047)。記事と要約は `Promise.all` で並列、関連記事は本文の取得前に投げて別の Suspense で受ける。記事ページへのリンク(カード・イベント行・関連記事)は画面内に入ると枠だけを先読みし、hover / touchstart で本文まで含めた full prefetch に切り替える(`unstable_dynamicOnHover` + `experimental.dynamicOnHover`)。
- 記事ページに着地すると `ArticleViewTracker` が `trackArticleView` で表示回数を加算(未ログインも計測)し、既読マークを付ける。クリック時ではなく着地側で行うのは、遷移でリクエストが中断されないようにするため。
- 保存系は ADR-0013 の `actions` スロットで注入(feed は bookmark/favorite を import しない)。

## 関連記事(記事ページ下部、ADR-0037)

- 配置: `/a/[id]` の右レール(`<aside>`)内、アクション行の後ろ。xl 以上は本文の右、xl 未満は本文の下に1カラムで続く(タイトルは xl で `text-sm`、行の padding は `py-3`)。独立した Suspense(`fallback={null}`)でストリームし、本文の表示を待たせない。`RelatedArticles`(Server Component)は空なら何も描画しない。
- 選定ルール:
  1. 対象記事の AI要約タグ(`article_summaries.tags`、`status='ready'` のみ有効)を1つ以上共有する他記事を「共有タグ数 降順 → publishedAt 降順 → id 降順」で最大6件(`ArticleRepository.listByTagOverlap`、1クエリ)
  2. 足りなければ同じ企業の新着で補完(自身とタグ一致済みを除く。`list({ sort: 'latest', companyIds, limit: limit + 1 })`)
  3. 対象記事が無ければ空配列
- 自身・削除済み・要約が ready でない記事は含めない。タグの表記ゆれは取りこぼす(類義語展開はしない)。
- キャッシュ: `getRelatedArticles` は `'use cache: remote'` + `cacheTag(article(id))` + `cacheLife('days')`(`feed` タグは cron で毎時数回無効化され、Runtime Cache の書き込みが増えるため外した。ADR-0047)。`tags` に索引は張らず、インスタンス間で共有されるキャッシュで1記事1回の走査に抑える(in-memory の `'use cache'` だとインスタンスの数だけ走査が走る。ADR-0042)。失敗(Result err・例外)は `logger.warn` して `cacheLife('minutes')` で `[]` を返し、記事ページを落とさない。
- シグネチャ: `listRelatedArticles(deps)(articleId, limit = RELATED_ARTICLES_LIMIT): Promise<Result<ArticleCard[], FeedError>>`(`features/feed/application/list-related-articles.ts`)。
- id は呼び出し側(ページ)で UUID 検証済みのものだけを渡す(不正形式は DB エラーになる)。

## タグ一覧ページ(/tags、ADR-0040)

- 公開・SEO 対象のハブ(`app/tags/page.tsx`)。構成は `/companies` と同じ(Header / 静的シェル + `connection()` + Suspense でストリーム)。h1「タグから探す」、canonical は自己参照 `/tags`、JSON-LD は `breadcrumbJsonLd`(ホーム → タグから探す)。
- 2セクション: 「最近よく書かれているタグ」(直近90日・上位40)と「すべてのタグ」(全期間・上位120)。各タグは `/?tag=<encodeURIComponent(tag)>` への輪郭バッジ + 件数(`text-fg-subtle`)。0件なら空状態メッセージ。直近セクションは0件なら出さない。
- 集計: `ArticleRepository.listPopularTags(limit, sinceDays?)` が `article_summaries.tags`(jsonb)を `jsonb_array_elements_text` で展開し、削除済み除外・`status='ready'` で `group by tag`、`count(distinct a.id) desc, tag asc`。`sinceDays` 指定時は `articles.published_at` で絞る。空白タグは除外。
- usecase `listPopularTags(deps)(limit = 120, sinceDays?)`(`features/feed/application/list-popular-tags.ts`): limit を 1..200 に丸め、空白タグを除外し `Result` で返す。
- キャッシュ: `getPopularTags()` は `'use cache'` + `cacheTag(feed)` + `cacheLife('hours')`。失敗は `logger.warn` して `{ recent: [], all: [] }` を `cacheLife('minutes')` で返す。
- タグは類義語展開しない(表記ゆれは別タグとして並ぶ)。リンク先の `?tag=` 側が `lib/tags/curated.ts` で類義語を展開する。
- 導線: `app/sitemap.ts` に `/tags`、サイドバー「カテゴリ」セクション末尾に「タグから探す」行。

## 公開 RSS フィード(ADR-0039)

- `/feed.xml`(全企業の新着50件。`?category=<key>` で職能カテゴリに絞り込み。不正キーは無視して全体。`?tag=<タグ>` で AI要約タグ(`/?tag=` と同じ類義語展開。空白のみ・50文字超は無視)に絞り込み、`category` と併用可)と `/companies/[slug]/feed.xml`(存在しない slug は404)を Route Handler で配信する。RSS 2.0 / `application/rss+xml`。
- item の `link` は元記事 URL(元ブログへの送客を優先)、`guid`(isPermaLink=false)は Techblo の記事ページ URL。`dc:creator` と `source` は企業名、`category` は AI要約タグ、`description` は AI要約 overview を優先し、無ければ RSS 抜粋。
- 合成は app 層(`app/_feed/public-feed.ts`)。XML 生成は `lib/rss/build-feed-xml.ts`(純粋関数、エスケープ・制御文字除去)。
- `Cache-Control: public, s-maxage=600, stale-while-revalidate=3600`。データは `getFeed`(feed タグで無効化)を再利用。失敗時は 500 + `logger.error`。
- ルートレイアウトの `alternates.types` で `/feed.xml` を自動検出用に宣言する。`/?tag=` 表示中は `app/(app)/page.tsx` の metadata がタグ別フィードも併記する。
