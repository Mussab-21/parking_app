import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';

jest.setTimeout(30000);

describe('Facilities & Availability Test Suite (M3)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  let ownerAToken: string;
  let ownerBToken: string;
  let adminToken: string;
  let facilityAId: string;

  const ownerAUser = {
    name: 'Owner A',
    phone: '+923111111111',
    password: 'Password123!',
  };

  const ownerBUser = {
    name: 'Owner B',
    phone: '+923222222222',
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

    // Ensure clean state for test owners
    await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [ownerAUser.phone, ownerBUser.phone]);
    await db.query(`DELETE FROM "facility_staff" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [ownerAUser.phone, ownerBUser.phone]);
    await db.query(`DELETE FROM "owner_profiles" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" IN ($1, $2));`, [ownerAUser.phone, ownerBUser.phone]);
    await db.query(`DELETE FROM "users" WHERE "phone" IN ($1, $2);`, [ownerAUser.phone, ownerBUser.phone]);

    // Register & activate Owner A
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(ownerAUser);
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "phone" = $1;`, [ownerAUser.phone]);
    const loginA = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: ownerAUser.phone, password: ownerAUser.password });
    ownerAToken = loginA.body.accessToken;

    // Register & activate Owner B with OWNER role
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(ownerBUser);
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE', "role" = 'OWNER' WHERE "phone" = $1;`, [ownerBUser.phone]);
    const loginB = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: ownerBUser.phone, password: ownerBUser.password });
    ownerBToken = loginB.body.accessToken;

    // Login Admin
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adminHash = await require('argon2').hash('Password123!', { type: require('argon2').argon2id });
    await db.query(`UPDATE "users" SET "password_hash" = $1, "status" = 'ACTIVE', "totp_secret_enc" = NULL WHERE "phone" = '+923001234567';`, [adminHash]);
    const adminLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: '+923001234567', password: 'Password123!' });
    adminToken = adminLogin.body.accessToken;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('M3-01: Owner application -> Admin approval -> Role updated to OWNER', async () => {
    // 1. Owner A applies
    const applyRes = await request(app.getHttpServer())
      .post('/api/v1/owner/apply')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ businessName: 'Owner A Enterprise' })
      .expect(201);

    expect(applyRes.body.verification_status).toBe('PENDING');

    // 2. Admin approves Owner A
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/owners/${applyRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(approveRes.body.verification_status).toBe('APPROVED');

    // Re-login Owner A to get updated token with OWNER role
    const loginA = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: ownerAUser.phone, password: ownerAUser.password });
    ownerAToken = loginA.body.accessToken;
    expect(loginA.body.user.role).toBe('OWNER');
  });

  it('M3-02: Facility creation -> Admin approval -> Zones & Bulk Slots creation', async () => {
    // 1. Create Facility
    const facRes = await request(app.getHttpServer())
      .post('/api/v1/owner/facilities')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Gulberg Grand Plaza',
        address: 'Main Gulberg, Lahore',
        city: 'Lahore',
        latitude: 31.52,
        longitude: 74.35,
        hourlyRatePaisa: 25000,
        openingHours: { monday: { open: '08:00', close: '22:00' } },
        contactPhone: '+923111111111',
      })
      .expect(201);

    facilityAId = facRes.body.id;
    expect(facRes.body.status).toBe('PENDING_APPROVAL');

    // 2. Admin approves facility
    await request(app.getHttpServer())
      .post(`/api/v1/admin/facilities/${facilityAId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Owner A creates Zone
    const zoneRes = await request(app.getHttpServer())
      .post(`/api/v1/owner/facilities/${facilityAId}/zones`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'VIP Zone', code: 'VZ' })
      .expect(201);

    // 4. Owner A bulk creates 10 slots
    const bulkRes = await request(app.getHttpServer())
      .post(`/api/v1/owner/facilities/${facilityAId}/slots/bulk`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        zoneId: zoneRes.body.id,
        prefix: 'VZ',
        startNumber: 1,
        count: 10,
        vehicleType: 'CAR',
      })
      .expect(200);

    expect(bulkRes.body.slots.length).toBe(10);
  });

  it('M3-03 (AUTHZ-02 IDOR Defense): Owner B CANNOT access or update Owner A facility (404 Not Found)', async () => {
    // Owner B (who has OWNER role) attempts to get details of Owner A's facility
    await request(app.getHttpServer())
      .get(`/api/v1/owner/facilities/${facilityAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .expect(404); // Returns 404 to avoid leaking existence

    // Owner B attempts to update Owner A's facility
    await request(app.getHttpServer())
      .patch(`/api/v1/owner/facilities/${facilityAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ name: 'Hacked Plaza', version: 1 })
      .expect(404);
  });

  it('M3-04 (DATA-05 Optimistic Locking): Update with outdated version returns 409 Conflict', async () => {
    // Owner A gets current facility details
    const currentFac = await request(app.getHttpServer())
      .get(`/api/v1/owner/facilities/${facilityAId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .expect(200);

    const version = currentFac.body.version;

    // Successful update with correct version
    await request(app.getHttpServer())
      .patch(`/api/v1/owner/facilities/${facilityAId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'Gulberg Grand Plaza - Updated', version })
      .expect(200);

    // Attempt update with stale version returns 409 Conflict
    await request(app.getHttpServer())
      .patch(`/api/v1/owner/facilities/${facilityAId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'Stale Update', version }) // Using old version
      .expect(409);
  });

  it('M3-05: Derived Availability Endpoint calculates free slots and slot states correctly', async () => {
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const availRes = await request(app.getHttpServer())
      .get(`/api/v1/facilities/${facilityAId}/availability?start=${startTime}&hours=2`)
      .expect(200);

    expect(availRes.body.facilityId).toBe(facilityAId);
    expect(availRes.body.totalSlots).toBe(10);
    expect(availRes.body.availableSlotsCount).toBe(10);
    expect(availRes.body.slots.every((s: any) => s.state === 'Available')).toBe(true);
  });

  it('M3-06: Audit Logs record facility state changes', async () => {
    const logsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(logsRes.body.data.length).toBeGreaterThan(0);
    const actions = logsRes.body.data.map((l: any) => l.action);
    expect(actions).toContain('FACILITY_APPROVED');
    expect(actions).toContain('OWNER_APPLICATION_APPROVED');
  });
});
