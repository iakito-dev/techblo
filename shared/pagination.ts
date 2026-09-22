import { z } from 'zod';

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Cursor を base64url で文字列化。
 * カーソルは {createdAt, id} 等のソート可能な値を含めることが多い。
 */
export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export function decodeCursor<T>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
}
