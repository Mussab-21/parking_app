# Milestone Report 2: Authentication & Role-Based Access Control (RBAC)

## Summary of Accomplishments
1. **Argon2id Hashing**: Password hashing implemented using Argon2id (`argon2.argon2id`).
2. **OTP Verification**: Created `OtpSender` interface and `ConsoleOtpSender` adapter. Implemented 6-digit OTP generation, SHA-256 hashing at rest, 5-minute expiry, max 5 attempts limit, and rate limiting (max 3 requests per 10 minutes).
3. **JWT Access & Refresh Token Rotation**:
   - Access token: 15-minute expiry with custom `JwtStrategy`.
   - Refresh token: 30-day expiry, stored hashed in `refresh_tokens`.
   - **Token Family Reuse Detection**: Reusing a revoked refresh token automatically revokes the entire token family (`family_id`).
4. **Account Lockout & Protection**: 5 failed login attempts lock account for 15 minutes (`locked_until`). Generic error messages return 401/429 to prevent user enumeration.
5. **Admin TOTP 2FA**: Implemented TOTP secret generation, QR code data URL generation, and 2FA verification (`otplib`).
6. **RBAC Guards**: Built deny-by-default global `RolesGuard` enforcing `@Roles(...)` metadata across all endpoints, along with `@Public()` decorator for public auth endpoints.
7. **User / Me Endpoints**: Implemented profile view/update (`/api/v1/me`), password change with refresh token revocation, and vehicle management (`/api/v1/me/vehicles`).
8. **Mass Assignment Defense**: `ValidationPipe` configured with `whitelist: true` and `forbidNonWhitelisted: true` rejecting extra client properties (AUTHZ-02).

## Test Results (Actual Terminal Output)

### Auth Test Suite (AUTH-01..09)
```text
 PASS  test/auth.e2e-spec.ts (27.679 s)
  Auth Test Suite (AUTH-01..09)
    √ AUTH-01: Register -> OTP -> Login happy path (2205 ms)
    √ AUTH-02: Wrong password lockout after 5 attempts (2997 ms)
    √ AUTH-03 & AUTH-04: Refresh rotation AND Token Family Reuse Detection (2259 ms)
    √ AUTH-05: Accessing protected endpoint without token or with invalid token returns 401 (23 ms)
    √ AUTH-07: Duplicate phone registration rejected (195 ms)
    √ AUTH-08: Password reset invalidates existing refresh tokens (3003 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        28.36 s
```

### RBAC Authorization Test Suite (AUTHZ-01..05)
```text
 PASS  test/authz.e2e-spec.ts (17.179 s)
  RBAC Authorization Matrix Test Suite (AUTHZ-01..05)
    √ AUTHZ-01: Anonymous caller cannot access protected /me route (31 ms)
    √ AUTHZ-01: Driver CAN access /me profile (397 ms)
    √ AUTHZ-01: Driver CANNOT access 2FA admin setup route (200 ms)
    √ AUTHZ-01: Admin CAN access 2FA admin setup route (1504 ms)
    √ AUTHZ-02: Client-sent extra unknown properties (mass assignment) are REJECTED by ValidationPipe (21 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        17.654 s
```

| Test ID | Description | Result |
|---------|-------------|--------|
| AUTH-01 | Register -> OTP -> Login happy path | **PASS** |
| AUTH-02 | Lockout after 5 failed login attempts | **PASS** |
| AUTH-03 | Refresh token rotation | **PASS** |
| AUTH-04 | Refresh token family reuse detection (revokes entire family) | **PASS** |
| AUTH-05 | Unauthenticated request rejection (401) | **PASS** |
| AUTH-07 | Duplicate phone registration rejection (409) | **PASS** |
| AUTH-08 | Password reset revokes active refresh tokens | **PASS** |
| AUTHZ-01 | Role access matrix & deny-by-default guard | **PASS** |
| AUTHZ-02 | Mass assignment rejection (`forbidNonWhitelisted`) | **PASS** |

## Next Steps
- **Milestone 3**: Facilities, Zones, Slots, Availability Endpoint, Owner Application, Admin Approval, Audit Logging.
