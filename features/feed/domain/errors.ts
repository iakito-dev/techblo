import type { CommonError } from '@/shared/error';

/**
 * feed feature のエラー型。現状は共通エラーで十分。
 * feed 固有のエラーが必要になればここで union を拡張する。
 */
export type FeedError = CommonError;
