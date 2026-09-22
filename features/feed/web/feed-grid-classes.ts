/**
 * トップのセクション(新着・棚)と一覧(`/?category=` 等)で共通の列数・余り非表示クラス(ADR-0035)。
 *
 * 以前は `@utility feed-columns` として globals.css に定義し、`md:feed-columns` のように
 * 「variant + 内部に @container を持つカスタムユーティリティ」の組み合わせで使っていたが、
 * 本番ビルド(next build の CSS 最適化)ではこの組み合わせが出力から丸ごと欠落し、デスクトップの
 * 一覧が常に1列になる不具合があった(`next dev` の非最適化 CSS では再現しない)。列数は
 * Tailwind v4 標準のコンテナクエリ variant(`@[<width>px]:`)を JSX 側で直接スタックする形に
 * 変えることで、本番ビルドでも確実に CSS が出力されることを確認済み。
 *
 * 列数はビューポートではなくコンテンツ領域の実幅で決めるため、祖先に Tailwind 組み込みの
 * `@container` を付けた要素の内側でだけ意味を持つ(サーバはビューポートを知らない。ADR-0019)。
 * md 未満は横スクロール等の別レイアウトなので、`md:` を必ず先頭に付けて併用する。
 * 1360px 以上=4列 / 900px 以上=3列 / 600px 以上=2列 / それ未満=1列。
 */
export const FEED_COLUMNS_CLASS =
  'md:@[600px]:grid-cols-2 md:@[900px]:grid-cols-3 md:@[1360px]:grid-cols-4';

/** flex(モバイルの横スクロール)から md+ で grid に切り替える版(feed-section.tsx 用)。 */
export const FEED_COLUMNS_DISPLAY_CLASS = `md:grid md:grid-cols-1 ${FEED_COLUMNS_CLASS}`;

/**
 * 実列数に満たない分を隠す(ADR-0035)。サーバは列数(=ビューポート)を知らないため、
 * 最大件数(新着12件・棚8件)を描画しておき、実際の列数に満たない分(行が欠ける分)を
 * app/globals.css の `.feed-latest-cutoff` / `.feed-shelf-cutoff` が nth-child 選択で隠す。
 *
 * 列数と同様、当初は Tailwind の任意 variant(`md:@[600px]:[&>*:nth-child(n+4)]:hidden` 等)を
 * JSX に直接並べる形で書いたが、本番ビルドでは Tailwind がサイト全体のユーティリティを
 * セレクタ内容(nth-child の値)でグルーピングして並べ替えてしまい、`latest` と `shelf` が
 * 共有する `nth-child(n+4)` を挟んで意図した宣言順(狭い→広いの順に手前を上書き)が崩れ、
 * 一部の幅で余りが隠れない不具合が発生した(next dev では気付けず、本番ビルドの CSS を実際に
 * 確認して発覚)。cutoff は宣言順の制御が本質的に必要なため、Tailwind のユーティリティ生成を
 * 経由しない普通の CSS クラス(globals.css に variant なしで直接記述)にしている。
 */
export function feedCutoffClass(kind: 'latest' | 'shelf'): string {
  return kind === 'latest' ? 'feed-latest-cutoff' : 'feed-shelf-cutoff';
}

/**
 * カード間の余白(ADR-0011 の「呼吸」を保ちつつモバイルの情報密度を上げる)。
 * モバイルは縦 24px(40px だとカード1件あたりの 1/5 が余白で、1画面に 2.5 件しか入らない)、
 * md+ は従来どおり縦 40px。横は複数列のときだけ効くので md 未満では無害。
 * 一覧・棚・スケルトンで同じ値を使い、読み込み中と読み込み後でリズムがずれないようにする。
 */
export const FEED_GAP_CLASS = 'gap-x-8 gap-y-6 md:gap-y-10';
