import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placepro';

const pool = new pg.Pool({ connectionString });

async function clear() {
  const client = await pool.connect();
  try {
    console.log('Truncating all PostgreSQL tables...');
    await client.query('TRUNCATE TABLE master_students, companies, placements, form_submissions, placement_forms, placement_notifications CASCADE');
    console.log('All PostgreSQL tables truncated successfully.');
  } catch (err) {
    console.error('Failed to truncate tables:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

clear();
