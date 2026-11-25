import { splitHighlight } from '../highlight-match';

/**
 * 検索語(query)の一致箇所を <mark> で強調して描画する。query が無い・一致しないときは素のテキスト。
 * 塗りは accent-soft の淡い面だけにし、文字色は親(hover/focus の teal 化など)をそのまま引き継ぐ。
 */
export function HighlightedText({ text, query }: { text: string; query?: string }) {
  const segments = splitHighlight(text, query);
  if (segments.length === 1 && !segments[0]?.match) return <>{text}</>;
  return (
    <>
      {segments.map((segment, i) =>
        segment.match ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: 区切り順は text と query から一意に決まり並び替わらない
            key={i}
            className="bg-accent-soft rounded-[3px] [box-decoration-break:clone] px-px text-inherit"
          >
            {segment.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 同上
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  );
}
