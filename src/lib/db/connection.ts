/**
 * NeonDB Connection & Transaction Helpers
 *
 * Uses @neondatabase/serverless for Cloudflare Workers compatibility:
 * - HTTP driver (neon) for one-shot queries — fastest, simplest
 * - WebSocket driver (Pool) for interactive transactions — atomic multi-step operations
 */

import {
  neon,
  Pool,
  type NeonQueryFunction,
  type PoolClient,
} from '@neondatabase/serverless';

/**
 * HTTP-based query function for one-shot queries
 * Works on Cloudflare Workers edge runtime
 */
export const sql: NeonQueryFunction<false, false> = neon(
  import.meta.env.DATABASE_URL
);

/**
 * Interactive Transaction Helper
 *
 * Enables atomic multi-step operations where step N depends on step N-1 results.
 * Used by the claim-engine (S1-04) for quasi-smart contract atomicity.
 *
 * IMPORTANT: Pool/Client connections via WebSocket work on Cloudflare Workers
 * within a single request handler. Don't create Pools outside request handlers.
 *
 * @example
 * ```typescript
 * const result = await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
 *   const { rows: [claim] } = await client.query(
 *     'INSERT INTO claims (...) VALUES (...) RETURNING *'
 *   );
 *   await client.query('INSERT INTO proofs (...) VALUES (...)', [...]);
 *   await client.query('UPDATE members SET trust_score_cached = ...', [...]);
 *   return claim;
 * });
 * ```
 */
export async function withTransaction<T>(
  dbUrl: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * For non-interactive batched transactions, use sql.transaction():
 *
 * @example
 * ```typescript
 * const [result1, result2] = await sql.transaction([
 *   sql`INSERT INTO table1 ...`,
 *   sql`INSERT INTO table2 ...`,
 * ]);
 * ```
 *
 * This sends multiple queries atomically over HTTP (no WebSocket needed).
 */
