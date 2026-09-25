import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';
import { TicketsService } from '../src/modules/tickets/tickets.service';

jest.setTimeout(60000);

describe('Payments & QR Tickets Test Suite (M5 / PAY-01..12, QR-01..10)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let ticketsService: TicketsService;

  let driverToken: string;
  let driverUserId: string;
  let attendantToken: string;
  let attendantUserId: string;
  let facilityId: string;
  let slotId: string;
  let vehicleId: string;

  const driverUser = {
    name: 'Payment Driver',
    phone: '+923445556666',
    password: 'Password123!',
  };

  const attendantUser = {
    name: 'Staff Attendant',
    phone: '+923556667777',
    password: 'Password123!',
  };

  const webhookSecret = process.env.WEBHOOK_SECRET || 'mock-webhook-secret';

  function signWebhook(payload: object): string {
    return crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex');
  }

  function getValidFutureStartTime(daysOffset = 1): Date {
    const startTime = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
    startTime.setMinutes(startTime.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (startTime.getMinutes() === 0) {
      startTime.setHours(startTime.getHours() + 1);
    }
    return startTime;
  }

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
    ticketsService = moduleFixture.get<TicketsService>(TicketsService);

    // Register & activate Driver
    await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [driverUser.phone, attendantUser.phone]);
    await db.query(`DELETE FROM "facility_staff" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [driverUser.phone, attendantUser.phone]);
    await db.query(`DELETE FROM "vehicles" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [driverUser.phone, attendantUser.phone]);
    await db.query(`DELETE FROM "users" WHERE "phone" IN ($1, $2);`, [driverUser.phone, attendantUser.phone]);

    await request(app.getHttpServer()).post('/api/v1/auth/register').send(driverUser);
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "phone" = $1;`, [driverUser.phone]);
    const driverLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: driverUser.phone, password: driverUser.password });
    driverToken = driverLogin.body.accessToken;
    driverUserId = driverLogin.body.user.id;

    // Register & activate Attendant
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(attendantUser);
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE', "role" = 'ATTENDANT' WHERE "phone" = $1;`, [attendantUser.phone]);
    const attendantLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: attendantUser.phone, password: attendantUser.password });
    attendantToken = attendantLogin.body.accessToken;
    attendantUserId = attendantLogin.body.user.id;

    // Create vehicle
    const vehRes = await db.query(
      `INSERT INTO "vehicles" ("user_id", "plate_raw", "plate_normalised")
       VALUES ($1, 'PAY-555', 'PAY555') RETURNING "id";`,
      [driverUserId]
    );
    vehicleId = vehRes.rows[0].id;

    // Fetch Demo Plaza facility & zone
    const facRes = await db.query(`SELECT "id" FROM "facilities" WHERE "name" = 'Demo Plaza' LIMIT 1;`);
    facilityId = facRes.rows[0].id;

    const zoneRes = await db.query(`SELECT "id" FROM "zones" WHERE "facility_id" = $1 LIMIT 1;`, [facilityId]);
    const zoneId = zoneRes.rows[0].id;

    // Create unique test slot for this test run
    const testSlotCode = `M5_SLOT_${Date.now()}`;
    const slotRes = await db.query(
      `INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "status", "vehicle_type")
       VALUES ($1, $2, $3, 'ACTIVE', 'CAR') RETURNING "id";`,
      [facilityId, zoneId, testSlotCode]
    );
    slotId = slotRes.rows[0].id;

    // Assign attendant to facility
    await db.query(
      `INSERT INTO "facility_staff" ("facility_id", "user_id", "access_role")
       VALUES ($1, $2, 'ATTENDANT') ON CONFLICT DO NOTHING;`,
      [facilityId, attendantUserId]
    );
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.query(`DELETE FROM "tickets" WHERE "booking_id" IN (SELECT "id" FROM "bookings" WHERE "slot_id" = $1);`, [slotId]);
      await db.query(`DELETE FROM "payments" WHERE "booking_id" IN (SELECT "id" FROM "bookings" WHERE "slot_id" = $1);`, [slotId]);
      await db.query(`DELETE FROM "parking_events" WHERE "booking_id" IN (SELECT "id" FROM "bookings" WHERE "slot_id" = $1);`, [slotId]);
      await db.query(`DELETE FROM "bookings" WHERE "slot_id" = $1;`, [slotId]);
      await db.query(`DELETE FROM "slots" WHERE "id" = $1;`, [slotId]);
      await db.query(`DELETE FROM "vehicles" WHERE "id" = $1;`, [vehicleId]);
      await db.query(`DELETE FROM "facility_staff" WHERE "user_id" = $1;`, [attendantUserId]);
      await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN ($1, $2);`, [driverUserId, attendantUserId]);
      await db.query(`DELETE FROM "users" WHERE "id" IN ($1, $2);`, [driverUserId, attendantUserId]);
    }
    if (app) {
      await app.close();
    }
  });

  it('PAY-01 & QR-01..03: Payment Webhook -> Booking CONFIRMED -> Active QR Ticket -> Attendant Scan CHECKED_IN & Re-scan Rejection', async () => {
    const startTime = getValidFutureStartTime(1); // 1 day in future

    // 1. Create Booking Hold
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

    const bookingId = bookingRes.body.id;

    // 2. Initiate Checkout
    const checkoutRes = await request(app.getHttpServer())
      .post(`/api/v1/payments/checkout/${bookingId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201);

    const providerRef = checkoutRes.body.providerReference;

    // 3. Webhook Payload & HMAC Signature
    const webhookPayload = {
      providerEventId: `EVT_${Date.now()}`,
      bookingId,
      providerReference: providerRef,
      amountPaisa: 40000,
      currency: 'PKR',
      status: 'SUCCEEDED',
    };

    const signature = signWebhook(webhookPayload);

    // 4. Send Webhook
    const webhookRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/MOCK_PROVIDER')
      .set('x-mock-signature', signature)
      .send(webhookPayload)
      .expect(200);

    expect(webhookRes.body.status).toBe('CONFIRMED');
    expect(webhookRes.body.ticketIssued).toBe(true);

    // Issue a known test ticket for scan testing
    const ticketObj = await ticketsService.issueTicket(bookingId);

    // Make entry window valid right now for test scan
    await db.query(
      `UPDATE "tickets" SET "valid_from" = NOW() - INTERVAL '5 minutes', "valid_until" = NOW() + INTERVAL '30 minutes' WHERE "id" = $1;`,
      [ticketObj.ticketId]
    );

    // 5. Attendant Scans Ticket
    const scanRes = await request(app.getHttpServer())
      .post('/api/v1/staff/scan')
      .set('Authorization', `Bearer ${attendantToken}`)
      .send({ qrToken: ticketObj.rawToken })
      .expect(200);

    expect(scanRes.body.result).toBe('VALID');

    // 6. QR-03: Re-scanning the same ticket MUST be rejected (ALREADY_USED)
    await request(app.getHttpServer())
      .post('/api/v1/staff/scan')
      .set('Authorization', `Bearer ${attendantToken}`)
      .send({ qrToken: ticketObj.rawToken })
      .expect(400);
  });

  it('PAY-03: Webhook Replay Protection (Duplicate webhook returns 200 OK and does nothing)', async () => {
    const startTime = getValidFutureStartTime(3); // 3 days in future

    const bookingRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        facilityId,
        slotId,
        vehicleId,
        startTime: startTime.toISOString(),
        durationHours: 1,
      })
      .expect(201);

    const bookingId = bookingRes.body.id;
    const providerEventId = `DUP_EVT_${Date.now()}`;

    const payload = {
      providerEventId,
      bookingId,
      providerReference: `MOCK_REF_${Date.now()}`,
      amountPaisa: 20000,
      currency: 'PKR',
      status: 'SUCCEEDED',
    };

    const sig = signWebhook(payload);

    // First Webhook call -> 200 OK
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/MOCK_PROVIDER')
      .set('x-mock-signature', sig)
      .send(payload)
      .expect(200);

    // Replay same webhook event -> 200 OK with duplicate ignored message
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/MOCK_PROVIDER')
      .set('x-mock-signature', sig)
      .send(payload)
      .expect(200);

    expect(dupRes.body.message).toContain('Duplicate webhook event ignored');
  });

  it('PAY-05: Invalid HMAC Signature is REJECTED', async () => {
    const payload = {
      providerEventId: `BAD_SIG_${Date.now()}`,
      bookingId: 'some-id',
      amountPaisa: 20000,
    };

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/payments/MOCK_PROVIDER')
      .set('x-mock-signature', 'invalid-fake-signature')
      .send(payload)
      .expect(400);
  });

  it('QR-09: Exit Session computes overstay charge correctly when exiting late', async () => {
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    startTime.setMinutes(0, 0, 0);

    // Insert CHECKED_IN booking that ended 1 hour ago
    const endTime = new Date(startTime.getTime() + 1 * 60 * 60 * 1000); // 1 hour ago
    const ref = `REF_EXIT_${Date.now()}`;

    const bRes = await db.query(
      `INSERT INTO "bookings" (
        "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
        "plate_snapshot", "name_snapshot", "phone_snapshot",
        "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa",
        "status", "checked_in_at"
      ) VALUES (
        $1, $2, $3, $4, $5,
        'PAY555', 'Driver', '+923445556666',
        $6, $7, 20000, 20000,
        'CHECKED_IN', NOW() - INTERVAL '2 hours'
      ) RETURNING "id";`,
      [ref, driverUserId, facilityId, slotId, vehicleId, startTime.toISOString(), endTime.toISOString()]
    );

    const bookingId = bRes.rows[0].id;

    // Attendant exits session
    const exitRes = await request(app.getHttpServer())
      .post(`/api/v1/staff/exit/${bookingId}`)
      .set('Authorization', `Bearer ${attendantToken}`)
      .expect(200);

    expect(exitRes.body.status).toBe('COMPLETED');
    expect(exitRes.body.overstayHours).toBeGreaterThan(0);
    expect(Number(exitRes.body.overstayAmountPaisa)).toBeGreaterThan(0);
  });
});
