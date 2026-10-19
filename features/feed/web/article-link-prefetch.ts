/**
 * 記事ページ(/a/[id])へのリンクに展開する先読み指定(ADR-0042)。
 *
 * 既定の prefetch(auto)は動的ルートの枠(skeleton)までしか先読みしないので、hover / touchstart の
 * 時点で本文まで含めた full prefetch に切り替える(`experimental.dynamicOnHover` が前提)。
 * App Router の Link は `unstable_dynamicOnHover` を受け付けるが、`next/link` の公開型(Pages Router 版)
 * には無いため、型を通さずに展開できるようオブジェクトで渡す。
 */
export const ARTICLE_LINK_PREFETCH: object = { unstable_dynamicOnHover: true };
