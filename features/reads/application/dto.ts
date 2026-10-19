/**
 * 閲覧履歴の表示用 DTO。readAt は ISO 文字列
 * ('use cache' を経ると Date が文字列化されうるため、最初から文字列で揃える)。
 */
export type ReadHistoryEntryDto = {
  articleId: string;
  readAt: string;
};
