/**
 * 共通エラー型。各 feature は自前で拡張可能。
 */

export type ValidationError = {
  kind: 'VALIDATION';
  issues: { path: string; message: string }[];
};

export type UnauthorizedError = { kind: 'UNAUTHORIZED' };
export type ForbiddenError = { kind: 'FORBIDDEN' };
export type NotFoundError = { kind: 'NOT_FOUND' };
export type InternalError = { kind: 'INTERNAL'; cause?: unknown };

export type CommonError =
  | ValidationError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | InternalError;
