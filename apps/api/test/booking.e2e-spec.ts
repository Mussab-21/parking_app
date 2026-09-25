import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';
import { BookingStateMachine } from '../src/modules/bookings/booking-state-machine';

jest.setTimeout(60000);

describe('Booking Engine & State Machine Test Suite (M4 / BOOK-01..15)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  let driverToken: string;
  let driverUserId: string;
  let facilityId: string;
  let slotId: string;
  let vehicleId: string;

  const driverUser = {
    name: 'Booking Driver',
    phone: '+923334445555',
    password: 'Password123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    db = moduleFixture.get<DatabaseService>(DatabaseService);

    // Clean up test user's data
    await db.query(`DELETE FROM "parking_events" WHERE "actor_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [driverUser.phone]);
    await db.query(`DELETE FROM "bookings" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [driverUser.phone]);
    await db.query(`DELETE FROM "idempotency_keys" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [driverUser.phone]);
    await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [driverUser.phone]);
    await db.query(`DELETE FROM "vehicles" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [driverUser.phone]);
    await db.query(`DELETE FROM "users" WHERE "phone" = $1;`, [driverUser.phone]);

    await request(app.getHttpServer()).post('/api/v1/auth/register').send(driverUser);
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "phone" = $1;`, [driverUser.phone]);

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: driverUser.phone, password: driverUser.password });
    driverToken = loginRes.body.accessToken;
    driverUserId = loginRes.body.user.id;

    // Create test vehicle
    const vehRes = await db.query(
      `INSERT INTO "vehicles" ("user_id", "plate_raw", "plate_normalised")
       VALUES ($1, 'BKG-100', 'BKG100') RETURNING "id";`,
      [driverUserId]
    );
    vehicleId = vehRes.rows[0].id;

    // Fetch seeded Demo Plaza facility and slot AB-1
    const facRes = await db.query(`SELECT "id" FROM "facilities" WHERE "name" = 'Demo Plaza' LIMIT 1;`);
    facilityId = facRes.rows[0].id;

    const slotRes = await db.query(`SELECT "id" FROM "slots" WHERE "facility_id" = $1 AND "slot_code" = 'AB-1' LIMIT 1;`, [facilityId]);
    slotId = slotRes.rows[0].id;

    // Clean up test bookings on slot AB-1
    await db.query(`DELETE FROM "parking_events" WHERE "facility_id" = $1;`, [facilityId]);
    await db.query(`DELETE FROM "bookings" WHERE "slot_id" = $1;`, [slotId]);
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.query(`DELETE FROM "parking_events" WHERE "actor_id" = $1;`, [driverUserId]);
      await db.query(`DELETE FROM "bookings" WHERE "slot_id" = $1;`, [slotId]);
      await db.query(`DELETE FROM "vehicles" WHERE "id" = $1;`, [vehicleId]);
      await db.query(`DELETE FROM "idempotency_keys" WHERE "user_id" = $1;`, [driverUserId]);
      await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" = $1;`, [driverUserId]);
      await db.query(`DELETE FROM "users" WHERE "id" = $1;`, [driverUserId]);
    }
    if (app) {
      await app.close();
    }
  });

  it('BOOK-01 & BOOK-03: Server-side price calculation and hourly rate snapshot protection', async () => {
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    startTime.setMinutes(0, 0, 0);

    // Create booking for 2 hours (rate = 20000 paisa/h -> total = 40000 paisa = PKR 400)
    const bookingRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        facilityId,
        slotId,
        vehicleId,
        startTime: startTime.toISOString(),
        durationHours: 2,
      })
      .expect(201);

    expect(bookingRes.body.amountPaisa).toBe('40000');
    expect(bookingRes.body.amountPkr).toBe(400);

    // Update facility hourly rate to 50000 paisa
    await db.query(`UPDATE "facilities" SET "hourly_rate_paisa" = 50000 WHERE "id" = $1;`, [facilityId]);

    // Retrieve booking: snapshot rate must remain 20000 paisa
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingRes.body.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(getRes.body.hourly_rate_paisa_snapshot).toBe('20000');
    expect(getRes.body.amount_paisa).toBe('40000');

    // Restore facility hourly rate to 20000 paisa
    await db.query(`UPDATE "facilities" SET "hourly_rate_paisa" = 20000 WHERE "id" = $1;`, [facilityId]);
  });

  it('BOOK-04: CONCURRENCY LOAD TEST - Parallel requests for same slot/time -> EXACTLY 1 succeeds, others get 409 Conflict', async () => {
    const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
    startTime.setMinutes(0, 0, 0);

    const payload = {
      facilityId,
      slotId,
      vehicleId,
      startTime: startTime.toISOString(),
      durationHours: 2,
    };

    // Execute 10 parallel requests concurrently
    const promises = Array.from({ length: 10 }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(payload)
    );

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.status === 201).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    expect(successCount).toBe(1); // Exactly 1 succeeded
    expect(conflictCount).toBe(9); // Exactly 9 rejected with 409 Conflict
  }, 30000);

  it('BOOK-11: State Machine Transition Table Validation', () => {
    // Legal transitions
    expect(() => BookingStateMachine.validateTransition('PENDING_PAYMENT', 'CONFIRMED')).not.toThrow();
    expect(() => BookingStateMachine.validateTransition('CONFIRMED', 'CHECKED_IN')).not.toThrow();
    expect(() => BookingStateMachine.validateTransition('CHECKED_IN', 'COMPLETED')).not.toThrow();
    expect(() => BookingStateMachine.validateTransition('CONFIRMED', 'CANCELLED')).not.toThrow();

    // Illegal transitions MUST throw BadRequestException
    expect(() => BookingStateMachine.validateTransition('COMPLETED', 'CONFIRMED')).toThrow();
    expect(() => BookingStateMachine.validateTransition('CANCELLED', 'CHECKED_IN')).toThrow();
    expect(() => BookingStateMachine.validateTransition('NO_SHOW', 'CHECKED_IN')).toThrow();
  });

  it('BOOK-12: Idempotency Key Replay returns identical response', async () => {
    const startTime = new Date(Date.now() + 96 * 60 * 60 * 1000);
    startTime.setMinutes(0, 0, 0);

    const idempotencyKey = `IDEMP_KEY_${Date.now()}`;
    const payload = {
      facilityId,
      slotId,
      vehicleId,
      startTime: startTime.toISOString(),
      durationHours: 1,
    };

    // First request
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .set('idempotency-key', idempotencyKey)
      .send(payload)
      .expect(201);

    // Replay with SAME idempotency key returns identical 201 response
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .set('idempotency-key', idempotencyKey)
      .send(payload)
      .expect(201);

    expect(res2.body.id).toBe(res1.body.id);

    // Replay with SAME key but DIFFERENT payload returns 409 Conflict
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({ ...payload, durationHours: 3 })
      .expect(409);
  });

  it('BOOK-14: Cancellation Refund Policy (>= 60 mins vs < 60 mins)', async () => {
    // 1. Booking far in future (>= 60 mins) -> Full Refund Eligible
    const startTimeFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    startTimeFuture.setMinutes(0, 0, 0);

    const bookingRes1 = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        facilityId,
        slotId,
        vehicleId,
        startTime: startTimeFuture.toISOString(),
        durationHours: 1,
      })
      .expect(201);

    // Simulate booking confirmed
    await db.query(`UPDATE "bookings" SET "status" = 'CONFIRMED' WHERE "id" = $1;`, [bookingRes1.body.id]);

    const cancelRes1 = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingRes1.body.id}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ reason: 'Plans changed' })
      .expect(200);

    expect(cancelRes1.body.isRefundEligible).toBe(true);
    expect(cancelRes1.body.refundAmountPkr).toBe(200);

    // 2. Booking starting in 30 mins (< 60 mins) -> No Refund
    // Construct a valid grid start time (e.g. next half hour)
    const startTimeSoon = new Date(Date.now() + 30 * 60 * 1000);
    startTimeSoon.setMinutes(startTimeSoon.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (startTimeSoon.getMinutes() === 0) {
      startTimeSoon.setHours(startTimeSoon.getHours() + 1);
    }

    const bookingRes2 = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        facilityId,
        slotId,
        vehicleId,
        startTime: startTimeSoon.toISOString(),
        durationHours: 1,
      })
      .expect(201);

    await db.query(`UPDATE "bookings" SET "status" = 'CONFIRMED' WHERE "id" = $1;`, [bookingRes2.body.id]);

    const cancelRes2 = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingRes2.body.id}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ reason: 'Late cancellation' })
      .expect(200);

    expect(cancelRes2.body.isRefundEligible).toBe(false);
    expect(cancelRes2.body.refundAmountPkr).toBe(0);
  });
});
