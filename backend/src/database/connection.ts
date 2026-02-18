import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let internalPool: pg.Pool | null = null;

// Initialize database
export async function initDatabase(): Promise<boolean> {
  try {
    let poolConfig: pg.PoolConfig;

    if (config.database.connectionString) {
      console.log('� Connecting to database using connection string...');

      // Use the connection string directly
      // Users on Render/Vercel with Supabase should use the Transaction Pooler URL due to IPv6 issues
      poolConfig = {
        connectionString: config.database.connectionString,
        ssl: { rejectUnauthorized: false }, // Required for Supabase/Render
      };
    } else {
      // Default config (localhost or explicit params)
      poolConfig = {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      };
    }

    // Create pool with final config
    internalPool = new Pool({
      ...poolConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await internalPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully at:', result.rows[0].now);
    client.release();
    return true;

  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);

    if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
      console.error('\n⚠️  DNS ERROR: Could not resolve database hostname.');
      console.error('💡  SUGGESTION: If you are using Supabase on Render:');
      console.error('    1. Go to your Supabase Dashboard -> Settings -> Database -> Connection String -> URI -> select "Transaction Pooler"');
      console.error('    2. Update your render.yaml or Render Environment Variable DATABASE_URL with the new string.');
      console.error('    3. The URL should look like: postgres://[user].[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/[db]\n');
    }

    return false;
  }
}

// Wrapper for Pool to maintain compatibility with existing code
export const pool = {
  query: async <T extends pg.QueryResultRow = any>(
    text: string | pg.QueryConfig<any[]>,
    params?: any[]
  ): Promise<pg.QueryResult<T>> => {
    if (!internalPool) {
      throw new Error('Database pool not initialized. Call initDatabase() first.');
    }
    return internalPool.query<T>(text, params);
  },
  connect: async (): Promise<pg.PoolClient> => {
    if (!internalPool) {
      throw new Error('Database pool not initialized. Call initDatabase() first.');
    }
    return internalPool.connect();
  },
  end: async (): Promise<void> => {
    if (internalPool) {
      await internalPool.end();
      console.log('PostgreSQL pool closed');
    }
  },
  on: (event: string, listener: (...args: any[]) => void): any => {
    if (!internalPool) return undefined;
    return (internalPool as any).on(event, listener);
  }
} as unknown as pg.Pool;

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Backward compatibility exports (no-op)
export async function testConnection(): Promise<boolean> {
  return internalPool !== null;
}

export async function closeConnection(): Promise<void> {
  return pool.end();
}
