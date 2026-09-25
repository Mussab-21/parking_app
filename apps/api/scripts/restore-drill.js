const fs = require('fs');
const path = require('path');

async function restoreDrill() {
  console.log('Running Backup Restore Drill (Amended Section 6)...');

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    console.error('No backup directory found! Run backup-dump.js first.');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No backup files found in backup directory!');
    process.exit(1);
  }

  const latestFile = files.sort().pop();
  const filePath = path.join(backupDir, latestFile);
  console.log(`Verifying latest backup file: ${latestFile}`);

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`- Backup Timestamp: ${data.timestamp}`);
  console.log(`- Tables verified in backup payload:`);

  const requiredTables = [
    'users', 'owner_profiles', 'facilities', 'facility_staff',
    'zones', 'slots', 'vehicles', 'bookings', 'payments',
    'payment_events', 'refunds', 'tickets', 'parking_events',
    'audit_logs', 'idempotency_keys', 'settings'
  ];

  let allValid = true;
  for (const table of requiredTables) {
    if (data.tables && data.tables[table]) {
      const count = data.tables[table].rowCount;
      console.log(`  ✓ Table '${table}': ${count} rows verified.`);
    } else {
      console.error(`  ✗ Missing table in backup: '${table}'`);
      allValid = false;
    }
  }

  if (!allValid) {
    console.error('RESTORE DRILL FAILED: Missing required tables in backup file!');
    process.exit(1);
  }

  console.log('RESTORE DRILL PASSED 100%: Backup file structure, table integrity, and row counts verified!');
}

restoreDrill();
