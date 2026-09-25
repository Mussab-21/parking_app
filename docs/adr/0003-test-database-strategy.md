# ADR 0003: Test Database Strategy

## Context
Integration tests require a real PostgreSQL instance to validate constraints (e.g. `bookings_no_overlap`).

## Decision
Integration tests will run against the Supabase database instance using isolated test tables/records or test database URLs. Before each integration test suite execution, test tables are cleared/reset using cleanup hooks (`beforeAll`/`afterAll`).

## Consequence
- Tests run against real Postgres with full constraint validation.
- Test suites must carefully isolate data to prevent collision during concurrent test runs.
