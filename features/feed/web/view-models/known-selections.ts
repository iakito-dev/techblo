/**
 * URL の選択(?company= の slug / ?feed= の id)のうち、選択肢に存在するものだけを順序を保って返す。
 *
 * サーバーは存在しない・購読スコープ外の slug を黙って捨て、残りが無ければ全体を返す
 * (resolveSelectedCompanyIds)。古い共有リンクや購読を外した企業の slug がチップやバッジに
 * 残ると、絞り込んでいないのに「絞り込み中」に見えるため、表示側もこれで揃える。
 */
export function pickKnownSelections(
  selected: readonly string[],
  knownKeys: Iterable<string>,
): string[] {
  const known = new Set(knownKeys);
  return selected.filter((key) => known.has(key));
}
