/**
 * JSON-LD(構造化データ)を <script type="application/ld+json"> で埋め込む。
 *
 * `<` を `<` にエスケープして、文字列値に閉じタグや別スクリプトが混入しても
 * DOM を抜け出せないようにする(JSON-LD 埋め込みの定番 XSS 対策)。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD はこの方式が標準
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
