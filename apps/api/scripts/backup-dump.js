const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function backup() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database for backup dump...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    const tables = [
      'users', 'owner_profiles', 'facilities', 'facility_staff',
      'zones', 'slots', 'vehicles', 'bookings', 'payments',
      'payment_events', 'refunds', 'tickets', 'parking_events',
      'audit_logs', 'idempotency_keys', 'settings'
    ];

    const backupData = {
      timestamp: new Date().toISOString(),
      tables: {},
    };

    for (const table of tables) {
      const res = await client.query(`SELECT * FROM "${table}";`);
      backupData.tables[table] = {
        rowCount: res.rows.length,
        rows: res.rows,
      };
      console.log(`- Dumped table '${table}': ${res.rows.length} rows.`);
    }

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `parksmart_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`Backup dump completed successfully! File saved to: ${backupFile}`);
  } catch (err) {
    console.error('Backup dump failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backup();
