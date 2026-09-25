import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as argon2 from 'argon2';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DIRECT_URL or DATABASE_URL is missing');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to database for seeding...');

  try {
    const passwordHash = await argon2.hash('DemoPass123!', { type: argon2.argon2id });

    // 1. Upsert Users
    const users = [
      { name: 'System Admin', phone: '+923001234567', email: 'admin@parksmart.pk', role: 'ADMIN' },
      { name: 'Plaza Owner', phone: '+923007654321', email: 'owner@demoplaza.pk', role: 'OWNER' },
      { name: 'Demo Attendant', phone: '+923001112223', email: 'attendant@demoplaza.pk', role: 'ATTENDANT' },
      { name: 'Standard Driver', phone: '+923459998887', email: 'driver@parksmart.pk', role: 'DRIVER' },
    ];

    const userMap: Record<string, string> = {};

    for (const u of users) {
      const res = await client.query(
        `INSERT INTO "users" ("name", "phone", "email", "password_hash", "role", "status")
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         ON CONFLICT ("phone") DO UPDATE SET "password_hash" = $4, "name" = $1, "email" = $3
         RETURNING "id";`,
        [u.name, u.phone, u.email, passwordHash, u.role]
      );
      userMap[u.role] = res.rows[0].id;
      console.log(`Seeded user: ${u.name} (${u.role}) -> ${userMap[u.role]}`);
    }

    // 2. Upsert Owner Profile
    await client.query(
      `INSERT INTO "owner_profiles" ("user_id", "business_name", "verification_status", "documents")
       VALUES ($1, 'Demo Parking Solutions', 'APPROVED', '{}'::jsonb)
       ON CONFLICT ("user_id") DO NOTHING;`,
      [userMap['OWNER']]
    );

    // 3. Upsert Facility "Demo Plaza Gulberg"
    const facRes = await client.query(
      `SELECT "id" FROM "facilities" WHERE "name" = 'Demo Plaza Gulberg' LIMIT 1;`
    );

    let facilityId: string;
    if (facRes.rows.length > 0) {
      facilityId = facRes.rows[0].id;
      console.log(`Facility already exists: ${facilityId}`);
    } else {
      const newFac = await client.query(
        `INSERT INTO "facilities" (
          "name", "address", "city", "latitude", "longitude", "status",
          "hourly_rate_paisa", "opening_hours", "contact_phone"
        ) VALUES (
          'Demo Plaza Gulberg', 'Main Boulevard, Gulberg III', 'Lahore', 31.5204, 74.3587, 'APPROVED',
          20000,
          '{"monday":{"open":"08:00","close":"22:00"},"tuesday":{"open":"08:00","close":"22:00"},"wednesday":{"open":"08:00","close":"22:00"},"thursday":{"open":"08:00","close":"22:00"},"friday":{"open":"08:00","close":"22:00"},"saturday":{"open":"08:00","close":"22:00"},"sunday":{"open":"08:00","close":"22:00"}}'::jsonb,
          '+923007654321'
        ) RETURNING "id";`
      );
      facilityId = newFac.rows[0].id;
      console.log(`Created facility Demo Plaza Gulberg -> ${facilityId}`);
    }

    // 4. Staff assignment
    await client.query(
      `INSERT INTO "facility_staff" ("facility_id", "user_id", "access_role")
       VALUES ($1, $2, 'OWNER'), ($1, $3, 'ATTENDANT')
       ON CONFLICT ("facility_id", "user_id") DO NOTHING;`,
      [facilityId, userMap['OWNER'], userMap['ATTENDANT']]
    );

    // 5. Zones AB and CD
    async function getOrCreateZone(code: string, name: string) {
      const zRes = await client.query(
        `SELECT "id" FROM "zones" WHERE "facility_id" = $1 AND "code" = $2 LIMIT 1;`,
        [facilityId, code]
      );
      if (zRes.rows.length > 0) return zRes.rows[0].id;
      const insRes = await client.query(
        `INSERT INTO "zones" ("facility_id", "name", "code") VALUES ($1, $2, $3) RETURNING "id";`,
        [facilityId, name, code]
      );
      return insRes.rows[0].id;
    }

    const zoneABId = await getOrCreateZone('AB', 'Zone AB');
    const zoneCDId = await getOrCreateZone('CD', 'Zone CD');

    // 6. Slots AB-1..10 and CD-1..10
    for (let i = 1; i <= 10; i++) {
      await client.query(
        `INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "status", "vehicle_type")
         VALUES ($1, $2, $3, 'ACTIVE', 'CAR')
         ON CONFLICT ("facility_id", "slot_code") DO NOTHING;`,
        [facilityId, zoneABId, `AB-${i}`]
      );
      await client.query(
        `INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "status", "vehicle_type")
         VALUES ($1, $2, $3, 'ACTIVE', 'CAR')
         ON CONFLICT ("facility_id", "slot_code") DO NOTHING;`,
        [facilityId, zoneCDId, `CD-${i}`]
      );
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
