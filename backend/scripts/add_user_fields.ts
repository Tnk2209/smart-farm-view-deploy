
import { pool } from '../src/database/connection.js';

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Adding new columns to "User" table...');

        await client.query(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS national_id VARCHAR(20),
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
    `);

        console.log('✅ Columns added successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
