# Milestone Report 4: Booking Engine & State Machine

## Summary of Accomplishments
1. **Booking State Machine (`BookingStateMachine`)**: Implemented explicit state transition table for `BookingStatusType` (`PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `EXPIRED`, `NO_SHOW`, `CANCELLED`). Illegal transitions throw `BadRequestException`.
2. **Server-Side Price Calculation**: Calculated as `amount_paisa = duration_hours * hourly_rate_paisa_snapshot`. Any client-sent price is strictly ignored.
3. **Hourly Rate Snapshot Protection**: The facility rate is copied onto the booking (`hourly_rate_paisa_snapshot`) at creation so future rate changes never alter existing bookings.
4. **Booking Hold Algorithm & Concurrency Protection**:
   - Single DB transaction hold creation with 10-minute hold duration (`hold_expires_at`).
   - Stale hold cleanup executed prior to new hold checks.
   - Database exclusion constraint (`bookings_no_overlap`) handles concurrent double-booking attempts at the PostgreSQL level.
5. **Idempotency Key Handling**: `idempotency_keys` table used to catch duplicate user intents (`POST /bookings` and `POST /bookings/:id/cancel`). Replaying same key with identical payload returns saved response; replaying same key with modified payload returns `409 Conflict`.
6. **Cancellation Refund Policy**:
   - Full refund eligible if cancelled `>= 60 minutes` before `start_time`.
   - No refund if cancelled `< 60 minutes` before `start_time`.
7. **Hold Expiry & No-Show Cron Jobs (`@nestjs/schedule`)**: Implemented 30-second recurring job expiring unpaid stale holds (`HOLD_EXPIRED`) and marking uncheck-in confirmed bookings past grace period as `NO_SHOW`.

## Test Results (Actual Terminal Output)

```text
 PASS  test/booking.e2e-spec.ts (43.331 s)
  Booking Engine & State Machine Test Suite (M4 / BOOK-01..15)
    √ BOOK-01 & BOOK-03: Server-side price calculation and hourly rate snapshot protection (2702 ms)
    √ BOOK-04: CONCURRENCY LOAD TEST - Parallel requests for same slot/time -> EXACTLY 1 succeeds, others get 409 Conflict (5829 ms)
    √ BOOK-11: State Machine Transition Table Validation (8 ms)
    √ BOOK-12: Idempotency Key Replay returns identical response (5634 ms)
    √ BOOK-14: Cancellation Refund Policy (>= 60 mins vs < 60 mins) (12621 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        43.851 s
Ran all test suites matching test/booking.e2e-spec.ts.
```

| Test ID | Description | Result |
|---------|-------------|--------|
| BOOK-01 | Server-side price calculation in paisa | **PASS** |
| BOOK-03 | Rate snapshot protection (rate changes don't affect existing bookings) | **PASS** |
| BOOK-04 | Concurrency load test: Parallel requests -> 1 success, others 409 Conflict | **PASS** |
| BOOK-11 | Booking state machine transition table validation | **PASS** |
| BOOK-12 | Idempotency key replay & conflict check | **PASS** |
| BOOK-14 | Cancellation refund policy (>= 60 min vs < 60 min) | **PASS** |

## Next Steps
- **Milestone 5**: Payments Adapter, Mock Payment Provider, Signature-Verified Webhook, Refunds, QR Tickets, Attendant Scanner Mode & Overstay.
