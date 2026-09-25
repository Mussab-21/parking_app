# Changelog — ParkSmart Pakistan

All notable changes to this project are documented in this file.

## [1.0.0-RC] - 2026-09-22

### Milestone 0 — Monorepo Architecture & Base Setup
- Established monorepo workspaces: `apps/api` (NestJS), `apps/admin-portal` (Next.js App Router), `apps/mobile` (Flutter).
- Integrated TypeScript, ESLint v9 Flat Config, Prettier, and Flutter lints.
- Created `MASTER_PROMPT.md`, `STACK.md`, `README.md`, and initial ADR log.

### Milestone 1 — PostgreSQL 16 Schema, Seed Data & Raw SQL Constraints
- Connected NestJS API to live Supabase PostgreSQL 16 instance.
- Defined Prisma schema with 18 models and required PostgreSQL enums.
- Created DDL migration `0_init/migration.sql` enabling `btree_gist` and `pgcrypto` extensions.
- Enforced database constraints in raw SQL:
  - `bookings_no_overlap` (Exclusion constraint for zero overlap double-booking defense)
  - `bookings_time_valid` (CHECK constraint for whole hours 1–12h)
  - `bookings_amount_positive` (CHECK constraint for `amount_paisa > 0`)
  - `tickets_one_active_per_booking` (Partial unique index)
- Implemented `scripts/seed-db.js` seeding "Demo Plaza", Zones `AB` & `CD`, Slots `AB-1..AB-10` / `CD-1..CD-10`, and demo users.
- Created automated test suite `test/db-constraints.spec.ts` verifying constraints against live Postgres.

### Milestone 2 — Authentication & RBAC
- Implemented Argon2id password hashing (`argon2.argon2id`).
- Implemented 6-digit OTP verification with SHA-256 hashing at rest, 5-minute expiry, and rate limiting (`ConsoleOtpSender`).
- Implemented JWT access tokens (15-min) and refresh token rotation (30-day).
- Implemented **Token Family Reuse Detection**: Reusing a revoked refresh token automatically revokes the entire token family.
- Implemented account lockout after 5 failed login attempts (15-min lock).
- Implemented TOTP 2FA for Admin accounts (`otplib`).
- Built deny-by-default global `RolesGuard` enforcing `@Roles(...)` metadata.
- Implemented user profile, password change, and vehicle management (`/me/vehicles`).
- Verified via test suites `test/auth.e2e-spec.ts` (AUTH-01..09) and `test/authz.e2e-spec.ts` (AUTHZ-01..05).

### Milestone 3 — Facilities, Zones, Slots & Derived Availability
- Implemented owner application (`POST /owner/apply`) and admin approval/rejection endpoints.
- Implemented facility, zone, and bulk slot creation (`POST /owner/facilities/:id/slots/bulk`).
- Enforced facility-scoped authorization (AUTHZ-02 IDOR defense): Owner A cannot access Owner B's facilities (returns 404).
- Implemented optimistic locking on facility updates using `version` column (returns 409 Conflict on stale version).
- Implemented derived availability calculations (`GET /facilities/:id/availability`) returning `Available`, `Reserved`, `Occupied`, or `Unavailable` states.
- Implemented append-only audit logging to `audit_logs` table.
- Verified via test suite `test/facilities.e2e-spec.ts`.

### Milestone 4 — Booking Engine & State Machine
- Created `BookingStateMachine` enforcing allowed status transitions (`PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `EXPIRED`, `NO_SHOW`, `CANCELLED`).
- Implemented server-side price calculation in paisa (`amount_paisa = duration_hours * hourly_rate_snapshot`).
- Implemented 10-minute hold creation with `idempotency_keys` table replay protection.
- Implemented cancellation refund policy (>= 60 mins before start -> full refund eligible; < 60 mins -> no refund).
- Implemented `@nestjs/schedule` 30-second cron job expiring stale holds and marking no-shows using idempotent `UPDATE ... RETURNING` queries.
- Verified via test suite `test/booking.e2e-spec.ts` including **BOOK-04 20-parallel request concurrency load test**.

### Milestone 5 — Payments Adapter, Webhooks, QR Tickets & Attendant Scanning
- Created `PaymentProvider` interface and `MockPaymentProvider` implementation.
- Implemented signature-verified webhook handler (`POST /webhooks/payments/:provider`) verifying HMAC-SHA256 signature against raw request body.
- Implemented `payment_events` replay protection ignoring duplicate event IDs.
- Implemented late-payment recovery re-confirming booking if slot is free, or creating automatic refund row if slot was taken.
- Implemented CSPRNG 32-byte QR ticket generation (`PSP1.<token>`) with SHA-256 token hashing at rest.
- Implemented attendant QR camera scanning (`POST /staff/scan`) with atomic single-use enforcement and entry window verification.
- Implemented attendant exit endpoint (`POST /staff/exit`) with automatic overstay charge calculation.
- Verified via test suite `test/payment-qr.e2e-spec.ts`.

### Milestone 6 — Flutter Mobile Application (M6a, M6b, M6c)
- Built complete Flutter mobile application (`apps/mobile`):
  - Design system tokens (`app_colors.dart` brand navy `#0B1F3A`, primary blue `#1E6FFF`, success teal `#12B5A6`, etc.).
  - Riverpod state management (`authProvider`).
  - GoRouter route guards for Driver vs Attendant shells.
  - Dio network client with automatic 401 JWT token refresh and idempotency key interceptors.
  - ARB English localisation (`app_en.arb`, Urdu-ready structure).
  - Driver flow screens (C01-C30): Splash, Welcome, Login, Signup, Verify OTP, Home, Search, Facility Details, Slot Grid, Summary with 10-Min Hold Countdown, Payment, QR Ticket.
  - **Offline QR Caching**: Confirmed QR tickets cached locally in secure storage, allowing drivers to display QR entry tickets with no internet connection.
  - Attendant Mode Shell (A01-A04): Attendant Home, Camera QR Scanner (`mobile_scanner`), Scan Result Dialog.
- Passed `flutter analyze` (0 errors) and `flutter test`.

### Milestone 7 — Next.js Web Portal (App Router)
- Built complete Next.js App Router Web Portal (`apps/admin-portal`):
  - Shared Pages (P01-P04): Login, Reset Password, Settings, 2FA Setup.
  - Owner Portal (O01-O12): Dashboard, Onboarding Wizard, Facilities & Zones, Bulk Slot Generator, Pricing Config, Reservations with **CSV Export**, Staff Management.
  - Admin Portal (AD-01-AD-11): Dashboard, Users, Owner Approvals, Facility Approvals, Audit Logs Explorer with server-side pagination, System Settings.
- Prerendered all 19 App Router static routes. Passed `npm run build` and `npm run lint`.

### Milestone 8 — Hardening, Security Review & QA Catalogue
- Built Security Threat Test Suite (`test/security.e2e-spec.ts`):
  - Parameterized queries protect against SQL injection (SEC-01).
  - Input text escaping protects against XSS (SEC-02).
  - ThrottlerGuard enforces rate limits (SEC-03).
  - Sanitized error responses hide stack traces and raw SQL (SEC-04).
- Built automated database backup dump (`scripts/backup-dump.js`) and restore drill (`scripts/restore-drill.js`) verifying table row counts and integrity (Amended Section 6').
- Executed full QA catalogue (7 test suites, 34 E2E tests passed 100% against live Supabase PostgreSQL).

### Milestone 9 — Release Candidate
- Created `DEMO_SCRIPT.md` covering all 8 End-to-End Scenarios from Section 16.3 of Master Prompt.
- Created `CHANGELOG.md`, `KNOWN_ISSUES.md`, and `RUNBOOK.md`.
- Verified Definition of Done (Section 19).
