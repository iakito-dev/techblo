/**
 * 企業ページの1ページ表示数。初期 SSR と「もっと読む」でオフセットが食い違わないよう、
 * ページと Server Action が同じ値を使う(page*limit で位置が決まるため)。
 * 'use server' ファイルは非関数を export できないので別ファイルに置く。
 */
export const COMPANY_PAGE_SIZE = 30;
