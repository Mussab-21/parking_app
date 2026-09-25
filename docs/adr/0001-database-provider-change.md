# ADR 0001: Database Provider Change

## Context
The initial plan (Milestone 0) was to use Docker for the PostgreSQL database. However, Docker is not currently available in the development environment.

## Decision
We are switching to **Supabase** as the PostgreSQL provider for both development and testing.

## Consequence
- Prisma will use `DIRECT_URL` for migrations and `DATABASE_URL` (pooled) for the application.
- The `btree_gist` and `pgcrypto` extensions must be enabled in the Supabase dashboard or via initial migration.
- Testing will be performed against the Supabase instance. We must be careful about data isolation and cleanliness during test runs.
