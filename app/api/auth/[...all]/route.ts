import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

/**
 * Better Auth の全エンドポイント(/api/auth/*)を catch-all で公開。
 * OAuth コールバックやセッション API はここを経由する。
 * 詳細仕様: docs/features/auth.md
 */
export const { GET, POST } = toNextJsHandler(auth);
