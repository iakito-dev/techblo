import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Supabase の Transaction Pooler(pgbouncer, port 6543)経由で接続する想定。
// pgbouncer は prepared statement を共有できないため prepare: false が必須。
// Serverless(Vercel)では接続が増えるため max は控えめにする。
const client = postgres(databaseUrl, {
  prepare: false,
  max: 1,
});

// postgres-js はトランザクション対応。db.transaction() が利用可能。
// (旧 neon-http ドライバはトランザクション非対応だったため、各 Repository が
//  単一 upsert / CTE で書かれている。互換で動くが、必要に応じて簡素化してよい。)
export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development',
});

export type Database = typeof db;
