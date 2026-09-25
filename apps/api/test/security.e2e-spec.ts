import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

describe('Security Threat Test Suite (SEC-01..10)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('SEC-01: SQL Injection payloads in login identifier rendered safe by parameterized queries', async () => {
    const sqlInjectionPayload = "'+OR+'1'='1'--";

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: sqlInjectionPayload,
        password: 'Password123!',
      })
      .expect(401); // 401 Unauthorized (not 500 SQL syntax error)
  });

  it('SEC-02: XSS payloads in registration name field stored safely without execution risk', async () => {
    const xssName = "<script>alert('XSS')</script>";
    const phone = `+923${Math.floor(100000000 + Math.random() * 900000000)}`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: xssName,
        phone,
        password: 'Password123!',
      })
      .expect(201);

    expect(res.body.user.name).toBe(xssName); // Stored literally, not executed
  });

  it('SEC-03: Rate Limiting throttler enforces 429 Too Many Requests when threshold exceeded', async () => {
    // Send multiple rapid login requests to exceed throttler limit
    let hitRateLimit = false;
    for (let i = 0; i < 110; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: '+923000000000', password: 'wrong' });

      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }

    expect(hitRateLimit).toBe(true);
  });

  it('SEC-04: Error handling returns sanitized JSON without stack traces or raw database leaks', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/facilities/non-existent-uuid-12345')
      .expect(404);

    expect(res.body.stack).toBeUndefined();
    expect(res.body.sql).toBeUndefined();
  });
});
