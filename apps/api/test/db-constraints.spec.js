import { Client } from 'pg';
import * as path from 'path';
import 'dotenv/config';
dotenvConfig({ path: path.join(__dirname, '../.env') });
function dotenvConfig(options) {
    require('dotenv').config(options);
}
describe('Database Constraints Test Suite (DATA-06)', () => {
    let client;
    let userId;
    let facilityId;
    let slotId;
    let vehicleId;
    beforeAll(async () => {
        const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
        expect(connectionString).toBeDefined();
        client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
        });
        await client.connect();
        const userRes = await client.query(`SELECT "id" FROM "users" WHERE "phone" = '+923459998887' LIMIT 1;`);
        userId = userRes.rows[0].id;
        const facilityRes = await client.query(`SELECT "id" FROM "facilities" WHERE "name" = 'Demo Plaza' LIMIT 1;`);
        facilityId = facilityRes.rows[0].id;
        const slotRes = await client.query(`SELECT "id" FROM "slots" WHERE "facility_id" = $1 AND "slot_code" = 'AB-1' LIMIT 1;`, [facilityId]);
        slotId = slotRes.rows[0].id;
        const vehicleRes = await client.query(`
      INSERT INTO "vehicles" ("user_id", "plate_raw", "plate_normalised")
      VALUES ($1, 'TEST-999', 'TEST999')
      RETURNING "id";
    `, [userId]);
        vehicleId = vehicleRes.rows[0].id;
        await client.query(`DELETE FROM "bookings" WHERE "slot_id" = $1;`, [slotId]);
    });
    afterAll(async () => {
        if (client) {
            await client.query(`DELETE FROM "bookings" WHERE "slot_id" = $1;`, [slotId]);
            await client.query(`DELETE FROM "vehicles" WHERE "id" = $1;`, [vehicleId]);
            await client.end();
        }
    });
    it('BOOK-05: Adjacent bookings (10:00-11:00 and 11:00-12:00) MUST both succeed', async () => {
        const startTime1 = new Date('2026-10-01T10:00:00Z').toISOString();
        const endTime1 = new Date('2026-10-01T11:00:00Z').toISOString();
        const startTime2 = new Date('2026-10-01T11:00:00Z').toISOString();
        const endTime2 = new Date('2026-10-01T12:00:00Z').toISOString();
        const res1 = await client.query(`
      INSERT INTO "bookings" (
        "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
        "plate_snapshot", "name_snapshot", "phone_snapshot",
        "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa", "status"
      ) VALUES (
        'TEST_ADJ_1', $1, $2, $3, $4,
        'TEST999', 'Driver', '+923459998887',
        $5, $6, 20000, 20000, 'CONFIRMED'
      ) RETURNING "id";
    `, [userId, facilityId, slotId, vehicleId, startTime1, endTime1]);
        expect(res1.rows[0].id).toBeDefined();
        const res2 = await client.query(`
      INSERT INTO "bookings" (
        "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
        "plate_snapshot", "name_snapshot", "phone_snapshot",
        "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa", "status"
      ) VALUES (
        'TEST_ADJ_2', $1, $2, $3, $4,
        'TEST999', 'Driver', '+923459998887',
        $5, $6, 20000, 20000, 'CONFIRMED'
      ) RETURNING "id";
    `, [userId, facilityId, slotId, vehicleId, startTime2, endTime2]);
        expect(res2.rows[0].id).toBeDefined();
    });
    it('BOOK-04 & DATA-06: Overlapping booking MUST be rejected by database exclusion constraint (bookings_no_overlap)', async () => {
        const startTimeOverlap = new Date('2026-10-01T10:30:00Z').toISOString();
        const endTimeOverlap = new Date('2026-10-01T11:30:00Z').toISOString();
        let error = null;
        try {
            await client.query(`
        INSERT INTO "bookings" (
          "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
          "plate_snapshot", "name_snapshot", "phone_snapshot",
          "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa", "status"
        ) VALUES (
          'TEST_OVERLAP', $1, $2, $3, $4,
          'TEST999', 'Driver', '+923459998887',
          $5, $6, 20000, 20000, 'CONFIRMED'
        );
      `, [userId, facilityId, slotId, vehicleId, startTimeOverlap, endTimeOverlap]);
        }
        catch (err) {
            error = err;
        }
        expect(error).not.toBeNull();
        expect(error.constraint || error.code).toBe('bookings_no_overlap');
    });
    it('DATA-06: Non-hourly duration (e.g. 45 mins) MUST be rejected by CHECK constraint (bookings_time_valid)', async () => {
        const startTimeValid = new Date('2026-10-02T10:00:00Z').toISOString();
        const endTimeInvalid = new Date('2026-10-02T10:45:00Z').toISOString();
        let error = null;
        try {
            await client.query(`
        INSERT INTO "bookings" (
          "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
          "plate_snapshot", "name_snapshot", "phone_snapshot",
          "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa", "status"
        ) VALUES (
          'TEST_INVALID_TIME', $1, $2, $3, $4,
          'TEST999', 'Driver', '+923459998887',
          $5, $6, 20000, 20000, 'CONFIRMED'
        );
      `, [userId, facilityId, slotId, vehicleId, startTimeValid, endTimeInvalid]);
        }
        catch (err) {
            error = err;
        }
        expect(error).not.toBeNull();
        expect(error.constraint || error.code).toBe('bookings_time_valid');
    });
    it('DATA-06: Non-positive amount MUST be rejected by CHECK constraint (bookings_amount_positive)', async () => {
        const startTimeValid = new Date('2026-10-03T10:00:00Z').toISOString();
        const endTimeValid = new Date('2026-10-03T11:00:00Z').toISOString();
        let error = null;
        try {
            await client.query(`
        INSERT INTO "bookings" (
          "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
          "plate_snapshot", "name_snapshot", "phone_snapshot",
          "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa", "status"
        ) VALUES (
          'TEST_ZERO_AMOUNT', $1, $2, $3, $4,
          'TEST999', 'Driver', '+923459998887',
          $5, $6, 20000, 0, 'CONFIRMED'
        );
      `, [userId, facilityId, slotId, vehicleId, startTimeValid, endTimeValid]);
        }
        catch (err) {
            error = err;
        }
        expect(error).not.toBeNull();
        expect(error.constraint || error.code).toBe('bookings_amount_positive');
    });
});
//# sourceMappingURL=db-constraints.spec.js.map