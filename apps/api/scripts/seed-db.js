const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or DIRECT_URL is missing!');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database for seeding...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected!');

    console.log('Seeding demo data into Supabase...');

    // 1. Insert Users
    const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash';

    const usersRes = await client.query(`
      INSERT INTO "users" ("name", "phone", "email", "password_hash", "role", "status")
      VALUES
        ('System Admin', '+923001234567', 'admin@parksmart.pk', $1, 'ADMIN', 'ACTIVE'),
        ('Plaza Owner', '+923007654321', 'owner@demoplaza.pk', $1, 'OWNER', 'ACTIVE'),
        ('Demo Attendant', '+923001112223', NULL, $1, 'ATTENDANT', 'ACTIVE'),
        ('Standard Driver', '+923459998887', NULL, $1, 'DRIVER', 'ACTIVE')
      ON CONFLICT ("phone") DO UPDATE SET "name" = EXCLUDED."name"
      RETURNING "id", "role", "phone";
    `, [passwordHash]);

    const usersByRole = {};
    usersRes.rows.forEach(u => { usersByRole[u.role] = u.id; });

    // 2. Insert Owner Profile
    await client.query(`
      INSERT INTO "owner_profiles" ("user_id", "business_name", "verification_status", "documents")
      VALUES ($1, 'Demo Parking Solutions', 'APPROVED', '{}'::jsonb)
      ON CONFLICT ("user_id") DO NOTHING;
    `, [usersByRole['OWNER']]);

    // 3. Insert Facility "Demo Plaza"
    const openingHours = JSON.stringify({
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '08:00', close: '22:00' },
    });

    const facilityRes = await client.query(`
      INSERT INTO "facilities" ("name", "address", "city", "latitude", "longitude", "status", "hourly_rate_paisa", "opening_hours", "contact_phone")
      VALUES ('Demo Plaza', 'Main Boulevard, Gulberg III', 'Lahore', 31.5204, 74.3587, 'APPROVED', 20000, $1::jsonb, '+923007654321')
      RETURNING "id";
    `, [openingHours]);

    const facilityId = facilityRes.rows[0].id;

    // 4. Facility Staff
    await client.query(`
      INSERT INTO "facility_staff" ("facility_id", "user_id", "access_role")
      VALUES
        ($1, $2, 'OWNER'),
        ($1, $3, 'ATTENDANT')
      ON CONFLICT DO NOTHING;
    `, [facilityId, usersByRole['OWNER'], usersByRole['ATTENDANT']]);

    // 5. Insert Zones AB and CD
    const zoneABRes = await client.query(`
      INSERT INTO "zones" ("facility_id", "name", "code")
      VALUES ($1, 'Zone AB', 'AB')
      RETURNING "id";
    `, [facilityId]);
    const zoneABId = zoneABRes.rows[0].id;

    const zoneCDRes = await client.query(`
      INSERT INTO "zones" ("facility_id", "name", "code")
      VALUES ($1, 'Zone CD', 'CD')
      RETURNING "id";
    `, [facilityId]);
    const zoneCDId = zoneCDRes.rows[0].id;

    // 6. Insert Slots AB-1..AB-10 and CD-1..CD-10
    for (let i = 1; i <= 10; i++) {
      await client.query(`
        INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "status", "vehicle_type")
        VALUES ($1, $2, $3, 'ACTIVE', 'CAR')
        ON CONFLICT ("facility_id", "slot_code") DO NOTHING;
      `, [facilityId, zoneABId, `AB-${i}`]);

      await client.query(`
        INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "status", "vehicle_type")
        VALUES ($1, $2, $3, 'ACTIVE', 'CAR')
        ON CONFLICT ("facility_id", "slot_code") DO NOTHING;
      `, [facilityId, zoneCDId, `CD-${i}`]);
    }

    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
