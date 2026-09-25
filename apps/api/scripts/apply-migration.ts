import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  console.log('Using connection string:', connectionString ? connectionString.replace(/:[^:@]+@/, ':****@') : 'NONE');

  if (!connectionString) {
    console.error('DIRECT_URL or DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, '../prisma/migrations/0_init/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration SQL...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
