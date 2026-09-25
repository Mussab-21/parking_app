import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';

describe('RBAC Authorization Matrix Test Suite (AUTHZ-01..05)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  let driverToken: string;
  let adminToken: string;

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

    // Ensure driver and admin have known password, ACTIVE status, and clear totp_secret_enc
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const testHash = await require('argon2').hash('Password123!', { type: require('argon2').argon2id });
    await db.query(
      `UPDATE "users"
       SET "password_hash" = $1, "status" = 'ACTIVE', "failed_login_count" = 0, "locked_until" = NULL, "totp_secret_enc" = NULL
       WHERE "phone" IN ('+923459998887', '+923001234567');`,
      [testHash]
    );

    // Login Driver
    const driverLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: '+923459998887', password: 'Password123!' });
    expect(driverLogin.status).toBe(200);
    driverToken = driverLogin.body.accessToken;

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: '+923001234567', password: 'Password123!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('AUTHZ-01: Anonymous caller cannot access protected /me route', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);
  });

  it('AUTHZ-01: Driver CAN access /me profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(res.body.role).toBe('DRIVER');
  });

  it('AUTHZ-01: Driver CANNOT access 2FA admin setup route', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });

  it('AUTHZ-01: Admin CAN access 2FA admin setup route', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.secret).toBeDefined();
    expect(res.body.qrCodeDataUrl).toBeDefined();
  });

  it('AUTHZ-02: Client-sent extra unknown properties (mass assignment) are REJECTED by ValidationPipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Malicious User',
        phone: '+923009999999',
        password: 'Password123!',
        role: 'ADMIN',
        maliciousExtraProperty: 'hacked',
      })
      .expect(400);
  });
});
