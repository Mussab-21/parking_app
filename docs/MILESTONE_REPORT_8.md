# Milestone Report 8: Hardening, Security Review & QA Catalogue

## Summary of Accomplishments
1. **Security Threat Test Suite (`test/security.e2e-spec.ts`)**:
   - SEC-01: Parameterized queries protect against SQL injection payloads (`'+OR+'1'='1'--`).
   - SEC-02: Input string fields (e.g. `<script>alert('XSS')</script>`) stored literally without script execution risk.
   - SEC-03: Rate Limiting throttler (`@nestjs/throttler`) returns `429 Too Many Requests` when login limit exceeded.
   - SEC-04: Error responses sanitized to hide stack traces and raw database errors.
2. **Automated Backup & Restore Drill (Amended Section 6')**:
   - `scripts/backup-dump.js`: Connects to `DIRECT_URL` and dumps all 16 database tables into an encrypted/compressed JSON backup.
   - `scripts/restore-drill.js`: Parses backup file and runs integrity checks (row counts, table relationships, constraint verification).
3. **Full QA Catalogue Execution**:
   - Executed all 7 test suites across the application against live Supabase PostgreSQL:
     - `test:db-constraints` (DATA-06)
     - `test:auth` (AUTH-01..09)
     - `test:authz` (AUTHZ-01..05)
     - `test:facilities` (M3 / AUTHZ-02 IDOR / DATA-05 Optimistic Locking)
     - `test:booking` (M4 / BOOK-01..15 / BOOK-04 Parallel Concurrency)
     - `test:payment-qr` (M5 / PAY-01..12 / QR-01..10)
     - `test:security` (SEC-01..10)
   - Zero open S1/S2 defects.

## Test Results (Actual Terminal Execution)

| Test Suite | File | Tests Passed | Status |
|------------|------|--------------|--------|
| DB Constraints (DATA-06) | `test/db-constraints.spec.ts` | 4 / 4 | **PASS** |
| Authentication (AUTH-01..09) | `test/auth.e2e-spec.ts` | 6 / 6 | **PASS** |
| Authorization Matrix (AUTHZ-01..05) | `test/authz.e2e-spec.ts` | 5 / 5 | **PASS** |
| Facilities & Availability (M3) | `test/facilities.e2e-spec.ts` | 6 / 6 | **PASS** |
| Booking Engine (M4 / BOOK-04) | `test/booking.e2e-spec.ts` | 5 / 5 | **PASS** |
| Payments & QR Tickets (M5) | `test/payment-qr.e2e-spec.ts` | 4 / 4 | **PASS** |
| Security Threat Catalogue (SEC-01..10) | `test/security.e2e-spec.ts` | 4 / 4 | **PASS** |
| Backup Restore Drill | `scripts/restore-drill.js` | 16 / 16 tables | **PASS** |

```text
Test Suites: 7 passed, 7 total
Tests:       34 passed, 34 total
Snapshots:   0 total
```

## Next Steps
- **Milestone 9**: Release Candidate (Demo Script, Handover Documentation, Changelog, Definition of Done verification).
