# ADDENDUM — Smart Car Parking Pakistan (ParkSmart)
## Supabase Database Change + Continuation Prompt for Milestones M2–M9

> Amends `docs/MASTER_PROMPT.md` with the Supabase decision and provides milestone instructions for M2 through M9.

---

## 0. WHAT CHANGED AND WHY
Milestone 0 could not bring up a local Dockerized PostgreSQL because the Docker daemon was unavailable in the build environment. Milestone 1 proceeded against a live Supabase PostgreSQL 16 instance (`docs/adr/0001-database-provider-change.md`).

### Amended decisions table (supersedes D3 and D18)
| # | Topic | Amended decision |
|---|-------|-------------------|
| D3′ | Backend/DB | NestJS + PostgreSQL 16 hosted on Supabase + Prisma |
| D18′ | Docker | Docker Compose is used for `api`, `admin-portal`, `nginx`, and tooling only. PostgreSQL is not run in Docker. |

---

## 1. ENVIRONMENTS ON SUPABASE
- **Dev project**: Connected for development.
- **Test project or schema**: Dedicated schema or project for integration tests reset between runs.
- **Production project**: Created at M9.

---

## 2. CONNECTION STRINGS AND ENV VARS
- `DATABASE_URL`: Pooled connection (port 6543) via PgBouncer.
- `DIRECT_URL`: Direct connection (port 5432) for migrations and session features.

---

## 3. UPDATED DOCKER COMPOSE SERVICES
Remove `postgres` service from `docker-compose.yml`.

---

## 4. CI PIPELINE UPDATE
CI runs tests against Supabase test project/schema using `DIRECT_URL`.

---

## 5. SECURITY NOTES
- App uses least-privilege DB role where possible.
- RLS disabled (auth handled in NestJS guard layer).

---

## 6. BACKUP AND RECOVERY UPDATE
- Nightly `pg_dump` against `DIRECT_URL`.
- `scripts/restore-drill.sh` restores into a temporary local container to verify integrity.

---

## 7. MILESTONE INSTRUCTIONS (M2 - M9)
- **M2**: Auth, OTP, Refresh Token Rotation, RBAC Guards, Throttling, TOTP 2FA.
- **M3**: Facilities, Zones, Slots, Availability computation, Owner/Admin management.
- **M4**: Booking Engine, State Machine, Holds, Hold Expiry Job.
- **M5**: Payments, Webhooks, Reconciliation, QR Tickets, Scan/Exit.
- **M6a/b/c**: Flutter Mobile App.
- **M7**: Web Portal (Next.js App Router).
- **M8**: Hardening, Security, QA Catalogue.
- **M9**: Release Candidate.
