# Milestone Report 1: Database Schema & Migrations

## Summary of Accomplishments
1. **Prisma Schema**: Created complete schema with all 18 tables and required PostgreSQL enums matching Section 10.2 of the Master Build Prompt.
2. **Supabase Integration**: Connected to live PostgreSQL 16 on Supabase (`DATABASE_URL` and `DIRECT_URL`).
3. **Database Migration & Extensions**: Applied `0_init/migration.sql` with `btree_gist` and `pgcrypto` extensions.
4. **Mandatory Constraints (Section 10.3)**:
   - `bookings_no_overlap`: Exclusion constraint preventing overlapping reservations for the same slot.
   - `bookings_time_valid`: Check constraint enforcing whole hours (1–12h).
   - `bookings_amount_positive`: Check constraint enforcing `amount_paisa > 0`.
   - `tickets_one_active_per_booking`: Partial unique index enforcing maximum one active ticket per booking.
5. **Seeding**: Executed `scripts/seed-db.js` populating demo facility "Demo Plaza", Zones `AB` and `CD`, Slots `AB-1..AB-10` and `CD-1..CD-10`, and demo users for all roles (`DRIVER`, `ATTENDANT`, `OWNER`, `ADMIN`).
6. **Constraint Test Suite (DATA-06)**: Executed against the live Supabase PostgreSQL database.

## Test Results (Actual Terminal Output)

```text
 PASS  test/db-constraints.spec.ts (11.01 s)
  Database Constraints Test Suite (DATA-06)
    √ BOOK-05: Adjacent bookings (10:00-11:00 and 11:00-12:00) MUST both succeed (381 ms)
    √ BOOK-04 & DATA-06: Overlapping booking MUST be rejected by database exclusion constraint (bookings_no_overlap) (187 ms)
    √ DATA-06: Non-hourly duration (e.g. 45 mins) MUST be rejected by CHECK constraint (bookings_time_valid) (184 ms)
    √ DATA-06: Non-positive amount MUST be rejected by CHECK constraint (bookings_amount_positive) (188 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        11.84 s
Ran all test suites matching test/db-constraints.spec.ts.
```

| Test ID | Description | Constraint | Result |
|---------|-------------|------------|--------|
| BOOK-05 | Adjacent non-overlapping bookings | N/A | **PASS** |
| BOOK-04 / DATA-06 | Overlapping booking rejection | `bookings_no_overlap` (Exclusion) | **PASS** |
| DATA-06 | Fractional duration rejection | `bookings_time_valid` (CHECK) | **PASS** |
| DATA-06 | Non-positive amount rejection | `bookings_amount_positive` (CHECK) | **PASS** |

## ADR Log
- `docs/adr/0001-database-provider-change.md`: Recorded deviation replacing Docker Postgres with Supabase PostgreSQL 16 due to local Docker availability.

## Next Steps
- **Milestone 2**: Authentication & Role-Based Access Control (RBAC).
