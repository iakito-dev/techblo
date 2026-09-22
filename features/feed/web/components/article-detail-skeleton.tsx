/**
 * 記事ページ(/a/[id])の読み込み中表示。
 *
 * loading.tsx(ルート遷移時)と page.tsx の Suspense fallback(記事取得中)の両方で使い、
 * 解決後の実レイアウトと同じ位置・高さのブロックを置く。ここがズレると本文到着時に
 * タイトルや画像が飛び跳ねて見える(遷移のチラつきの主因)。
 *
 * 骨格は記事本体と同じ「上罫 → 見出し行 → タイトル → AI要約 → 抜粋 → 画像 → フッター」。
 * 上罫と見出し行(20px)は一覧のカードとも同じ高さなので、カードを押した瞬間から頭の位置が
 * 動かない。面はカードと同じく持たせず、テキスト行と画像枠だけを surface-3 の
 * プレースホルダで示す(ADR-0035 の「面・影・角丸を使わない」に合わせる)。
 */
export function ArticleDetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse border-border-default border-t-[1.5px] pt-4">
      {/* 見出し行: ファビコン(20px)+ 企業名 / 右端に日時 */}
      <div className="mb-3 flex h-5 items-center gap-[7px]">
        <div className="size-5 rounded-sm bg-bg-surface-3" />
        <div className="h-3 w-24 rounded-xs bg-bg-surface-3" />
        <div className="ml-auto h-3 w-12 rounded-xs bg-bg-surface-3" />
      </div>
      {/* タイトル2行(22px/1.4 = 31px 行、md は 26px/1.4 = 36px 行) */}
      <div className="h-6 w-full rounded-xs bg-bg-surface-3 md:h-7" />
      <div className="mt-[7px] h-6 w-3/5 rounded-xs bg-bg-surface-3 md:mt-2 md:h-7" />
      {/* AI要約ブロック(teal 左罫 + ラベル + 3行) */}
      <div className="mt-5 border-accent/40 border-l-2 py-0.5 pl-4">
        <div className="mb-2 h-4 w-16 rounded-xs bg-bg-surface-3" />
        <div className="space-y-[11px]">
          <div className="h-4 w-full rounded-xs bg-bg-surface-3" />
          <div className="h-4 w-full rounded-xs bg-bg-surface-3" />
          <div className="h-4 w-4/5 rounded-xs bg-bg-surface-3" />
        </div>
      </div>
      {/* 抜粋(15px/1.8 = 27px 行) */}
      <div className="mt-5 space-y-[11px]">
        <div className="h-4 w-full rounded-xs bg-bg-surface-3" />
        <div className="h-4 w-11/12 rounded-xs bg-bg-surface-3" />
        <div className="h-4 w-2/3 rounded-xs bg-bg-surface-3" />
      </div>
      {/* 元記事ブロック(画像 1200/630・角丸なし → ドメイン1行) */}
      <div className="mt-6">
        <div className="aspect-[1200/630] w-full bg-bg-surface-3" />
        <div className="mt-2 h-4 w-40 rounded-xs bg-bg-surface-3" />
      </div>
      {/* アクション行(左にアイコン3つ / 右端に「元記事を開く」) */}
      <div className="mt-6 flex items-center gap-1 border-border-default border-t pt-4">
        <div className="size-11 rounded-full bg-bg-surface-3" />
        <div className="size-11 rounded-full bg-bg-surface-3" />
        <div className="size-11 rounded-full bg-bg-surface-3" />
        <div className="ml-auto h-12 w-36 rounded-md bg-bg-surface-3" />
      </div>
    </div>
  );
}
