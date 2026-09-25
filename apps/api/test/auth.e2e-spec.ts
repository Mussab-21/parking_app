import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';

describe('Auth Test Suite (AUTH-01..09)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  const testDriver = {
    name: 'E2E Test Driver',
    phone: '+923991112233',
    email: 'driver.e2e@parksmart.pk',
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

    // Clean up test user if exists
    await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [testDriver.phone]);
    await db.query(`DELETE FROM "otp_codes" WHERE "phone" = $1;`, [testDriver.phone]);
    await db.query(`DELETE FROM "users" WHERE "phone" = $1;`, [testDriver.phone]);
  });

  afterAll(async () => {
    if (db) {
      await db.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "phone" = $1);`, [testDriver.phone]);
      await db.query(`DELETE FROM "otp_codes" WHERE "phone" = $1;`, [testDriver.phone]);
      await db.query(`DELETE FROM "users" WHERE "phone" = $1;`, [testDriver.phone]);
    }
    if (app) {
      await app.close();
    }
  });

  it('AUTH-01: Register -> OTP -> Login happy path', async () => {
    // 1. Register
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testDriver)
      .expect(201);

    expect(regRes.body.user).toBeDefined();
    expect(regRes.body.user.phone).toBe(testDriver.phone);

    // Get generated OTP code from database for verification
    const otpRes = await db.query(
      `SELECT "id" FROM "otp_codes" WHERE "phone" = $1 ORDER BY "created_at" DESC LIMIT 1;`,
      [testDriver.phone]
    );
    expect(otpRes.rows.length).toBe(1);

    // Verify user
    await db.query(`UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "phone" = $1;`, [testDriver.phone]);

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testDriver.phone,
        password: testDriver.password,
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();
    expect(loginRes.body.user.role).toBe('DRIVER');
  });

  it('AUTH-02: Wrong password lockout after 5 attempts', async () => {
    // 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: testDriver.phone,
          password: 'WrongPassword!',
        })
        .expect(401);
    }

    // 5th wrong attempt triggers lockout
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testDriver.phone,
        password: 'WrongPassword!',
      })
      .expect(401);

    // 6th attempt should be blocked by lockout (429 Too Many Requests)
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testDriver.phone,
        password: testDriver.password,
      })
      .expect(429);

    // Unlock user for subsequent tests
    await db.query(`UPDATE "users" SET "failed_login_count" = 0, "locked_until" = NULL WHERE "phone" = $1;`, [testDriver.phone]);
  });

  it('AUTH-03 & AUTH-04: Refresh rotation AND Token Family Reuse Detection', async () => {
    // Login to get token pair 1
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testDriver.phone,
        password: testDriver.password,
      })
      .expect(200);

    const refreshToken1 = loginRes.body.refreshToken;
    expect(refreshToken1).toBeDefined();

    // 1. Refresh token rotation: use refreshToken1 to get refreshToken2
    const refreshRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshToken1 })
      .expect(200);

    const refreshToken2 = refreshRes1.body.refreshToken;
    expect(refreshToken2).toBeDefined();
    expect(refreshToken2).not.toBe(refreshToken1);

    // 2. REUSE DETECTION (AUTH-04): Try to reuse the already-rotated refreshToken1
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshToken1 })
      .expect(401);

    // 3. Verify that refreshToken2 is NOW ALSO REVOKED because the entire family was revoked!
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshToken2 })
      .expect(401);
  });

  it('AUTH-05: Accessing protected endpoint without token or with invalid token returns 401', async () => {
    // No token
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);

    // Invalid token
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });

  it('AUTH-07: Duplicate phone registration rejected', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testDriver)
      .expect(409);
  });

  it('AUTH-08: Password reset invalidates existing refresh tokens', async () => {
    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testDriver.phone,
        password: testDriver.password,
      })
      .expect(200);

    const activeRefreshToken = loginRes.body.refreshToken;

    // Simulate password reset request & verify
    const newPassword = 'NewSecretPassword123!';

    // Create an active OTP for reset
    const otpCode = '123456';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const codeHash = require('crypto').createHash('sha256').update(otpCode).digest('hex');
    await db.query(
      `INSERT INTO "otp_codes" ("phone", "purpose", "code_hash", "expires_at")
       VALUES ($1, 'PASSWORD_RESET', $2, NOW() + INTERVAL '5 minutes');`,
      [testDriver.phone, codeHash]
    );

    // Reset password
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        phone: testDriver.phone,
        code: otpCode,
        newPassword,
      })
      .expect(200);

    // Active refresh token should now be revoked (401)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: activeRefreshToken })
      .expect(401);

    // Restore original password
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const newHash = await require('argon2').hash(testDriver.password, { type: require('argon2').argon2id });
    await db.query(`UPDATE "users" SET "password_hash" = $1 WHERE "phone" = $2;`, [newHash, testDriver.phone]);
  });
});
