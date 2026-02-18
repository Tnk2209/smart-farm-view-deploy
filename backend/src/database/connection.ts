import pg from 'pg';
import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';
import { config } from '../config.js';

const { Pool } = pg;

let internalPool: pg.Pool | null = null;

// Initialize database with forced IPv4 resolution
export async function initDatabase(): Promise<boolean> {
  try {
    let poolConfig: pg.PoolConfig;

    if (config.database.connectionString) {
      // Force IPv4 if using connection string
      console.log('🔄 Resolving database host to IPv4 using dns.lookup...');
      try {
        const url = new URL(config.database.connectionString);
        const originalHost = url.hostname;

        // Resolve hostname to IPv4 using dns.lookup (uses OS resolver, handles CNAMEs)
        const lookup = promisify(dns.lookup);
        const { address } = await lookup(originalHost, { family: 4 });

        if (address) {
          console.log(`✅ Resolved ${originalHost} to IPv4: ${address}`);

          // Replace hostname with IPv4 in connection string
          url.hostname = address;
          poolConfig = {
            connectionString: url.toString(),
            ssl: { rejectUnauthorized: false }, // Render/Supabase often require this
          };
        } else {
          console.warn(`⚠️ Could not resolve ${originalHost} to IPv4, using original string.`);
          poolConfig = {
            connectionString: config.database.connectionString,
            ssl: { rejectUnauthorized: false },
          };
        }
      } catch (err) {
        console.error('❌ Failed to resolve hostname via DNS:', err);

        // Fallback to known Supabase IPv4 (hardcoded for stability)
        // IP obtained from: nslookup aws-0-ap-southeast-1.pooler.supabase.com
        const FALLBACK_IP = '52.77.146.31';
        console.warn(`⚠️ Using fallback IPv4 address: ${FALLBACK_IP}`);

        try {
          const url = new URL(config.database.connectionString);
          const originalHostname = url.hostname;

          // Extract project reference from hostname (e.g. db.abcdefg.supabase.co -> abcdefg)
          const projectRef = originalHostname.split('.')[1];

          url.hostname = FALLBACK_IP;

          if (projectRef && !url.username.includes(projectRef)) {
            // Supavisor needs [user].[project_ref] format when connecting via IP
            console.log(`🔧 Appending project ref '${projectRef}' to username for direct IP connection`);
            url.username = `${url.username}.${projectRef}`;
          }

          poolConfig = {
            connectionString: url.toString(),
            ssl: { rejectUnauthorized: false },
          };
        } catch (urlErr) {
          console.error('❌ Failed to construct fallback URL:', urlErr);
          // Final fallback: original config
          poolConfig = {
            connectionString: config.database.connectionString,
            ssl: { rejectUnauthorized: false },
          };
        }
      }
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
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await internalPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully at:', result.rows[0].now);
    client.release();
    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
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
