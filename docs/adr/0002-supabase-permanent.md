# ADR 0002: Permanent Adoption of Supabase PostgreSQL

## Context
Milestone 0 and 1 successfully connected to Supabase PostgreSQL 16 due to local Docker limitations.

## Decision
We permanently adopt Supabase as the PostgreSQL hosting provider for development, testing, and production environments, amending decisions D3 and D18 from `docs/MASTER_PROMPT.md`.

## Consequence
- No local `postgres` container in `docker-compose.yml`.
- Application queries use PgBouncer pooler (`DATABASE_URL`).
- Migrations use direct connection (`DIRECT_URL`).
