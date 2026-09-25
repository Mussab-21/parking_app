# Operations Runbook — ParkSmart Pakistan

Operational instructions for managing the ParkSmart API, database migrations, Supabase connection pool, backup/restore drills, and emergency procedures.

---

## 1. System Architecture Overview
- **Backend API**: NestJS monolith running on Node.js.
- **Database**: PostgreSQL 16 hosted on Supabase (`DATABASE_URL` via PgBouncer port 6543, `DIRECT_URL` direct port 5432).
- **Web Portal**: Next.js App Router portal for Owners and Admins.
- **Mobile App**: Flutter mobile app for Drivers and Attendants.

---

## 2. Environment Variables & Connection Strings

| Variable | Description | Port / Protocol |
|----------|-------------|-----------------|
| `DATABASE_URL` | Transaction-mode pooled connection for NestJS API | `6543` / `postgresql://` |
| `DIRECT_URL` | Direct connection for migrations, DDL, and backup dumps | `5432` / `postgresql://` |
| `JWT_SECRET` | Secret key for signing JWT access tokens | Secret |
| `WEBHOOK_SECRET` | Secret key for verifying HMAC-SHA256 payment webhooks | Secret |

---

## 3. Database Migrations & DDL Deployment
To apply raw SQL migrations against Supabase:

```bash
# Navigate to API directory
cd apps/api

# Apply raw SQL migration using direct connection
npm run db:migrate
```

---

## 4. Nightly Backup Dump & Restore Drill Procedure (Amended Section 6')

### 1. Perform Backup Dump
Connects to `DIRECT_URL` and dumps all 16 application tables into an encrypted JSON backup file:

```bash
cd apps/api
npm run backup:dump
```

Backup files are saved under `apps/api/backups/parksmart_backup_<timestamp>.json`.

### 2. Perform Restore Drill
Parses the latest backup file and verifies row counts and table integrity:

```bash
cd apps/api
npm run restore:drill
```

Target RPO: `<= 24 hours` (MVP) / `<= 5 mins` (Production with PITR enabled).
Target RTO: `<= 1 hour`.

---

## 5. Emergency Incident Playbooks

### Emergency 1: Suspected Token Compromise / Revoke All Sessions
To revoke all active refresh tokens immediately for a specific user or globally across the platform:

```sql
-- Revoke all active refresh tokens globally
UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "revoked_at" IS NULL;
```

### Emergency 2: Stuck Pending Payment Reconciliation
The background job (`@nestjs/schedule`) automatically checks pending payments older than 2 minutes. To manually inspect stuck payments:

```sql
SELECT * FROM "payments" WHERE "status" = 'PENDING' AND "created_at" < NOW() - INTERVAL '5 minutes';
```

### Emergency 3: Rotate JWT Secret
1. Update `JWT_SECRET` in environment variables.
2. Restart API service.
3. Revoke all active refresh tokens (forces all users to log in again with new secret).
