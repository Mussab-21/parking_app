# Milestone Report 5: Payments Adapter, Webhooks, QR Tickets & Attendant Scanning Mode

## Summary of Accomplishments
1. **`PaymentProvider` Adapter Pattern**: Declared `PaymentProvider` interface (`createOrder`, `verifyWebhook`, `getStatus`, `refund`).
2. **`MockPaymentProvider`**: Built mock payment gateway generating checkout sessions, HMAC-SHA256 signature verification, and handling refunds.
3. **Signature-Verified Webhook**:
   - `POST /api/v1/webhooks/payments/:provider` verifies HMAC-SHA256 signature against raw request body.
   - Replay protection via `payment_events` unique index (`provider`, `provider_event_id`). Replaying duplicate event ID returns `200 OK` ("Duplicate webhook event ignored").
   - Updates payment status to `SUCCEEDED` and transitions booking `PENDING_PAYMENT` -> `CONFIRMED`.
4. **Late Payment Recovery**:
   - Re-confirms booking if hold expired but slot remains free.
   - Marks payment `REFUND_REQUIRED` and automatically inserts a `refunds` row if slot was taken by another user.
5. **CSPRNG QR Tickets**:
   - Generates 32-byte CSPRNG token (`PSP1.<token>`) upon booking confirmation.
   - Stores `SHA-256(token)` in `tickets.token_hash`.
   - Entry window: `valid_from = start_time - 15m`, `valid_until = start_time + 30m`.
   - Contains NO PII, NO payment data, NO booking ID.
6. **Attendant Scan & Single-Use Enforcement**:
   - `POST /api/v1/staff/scan` verifies QR token, entry window, and facility assignment.
   - Atomic `UPDATE tickets SET status = 'USED' WHERE id = $1 AND status = 'ACTIVE'` prevents double scanning. Re-scanning a used ticket returns `400 Bad Request`.
   - Transitions booking to `CHECKED_IN` and writes `ENTRY_CONFIRMED` event.
7. **Exit Session & Overstay Calculation**:
   - `POST /api/v1/staff/exit/:bookingId` transitions `CHECKED_IN` -> `COMPLETED`.
   - Calculates overstay hours and overstay charge in paisa (`overstay_amount_paisa`) if exiting past 10-minute grace period.

## Test Results (Actual Terminal Output)

```text
 PASS  test/payment-qr.e2e-spec.ts (47.115 s)
  Payments & QR Tickets Test Suite (M5 / PAY-01..12, QR-01..10)
    √ PAY-01 & QR-01..03: Payment Webhook -> Booking CONFIRMED -> Active QR Ticket -> Attendant Scan CHECKED_IN & Re-scan Rejection (13118 ms)
    √ PAY-03: Webhook Replay Protection (Duplicate webhook returns 200 OK and does nothing) (7215 ms)
    √ PAY-05: Invalid HMAC Signature is REJECTED (9 ms)
    √ QR-09: Exit Session computes overstay charge correctly when exiting late (2407 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        47.556 s
Ran all test suites matching test/payment-qr.e2e-spec.ts.
```

| Test ID | Description | Result |
|---------|-------------|--------|
| PAY-01 / QR-01 | Payment Checkout -> Signature Verified Webhook -> CONFIRMED -> Ticket -> CHECKED_IN | **PASS** |
| PAY-03 | Webhook replay protection (duplicate event ID returns 200 OK) | **PASS** |
| PAY-05 | Invalid HMAC-SHA256 webhook signature rejection (400) | **PASS** |
| QR-03 | QR ticket single-use enforcement (re-scan rejected) | **PASS** |
| QR-09 | Attendant exit session & overstay charge calculation | **PASS** |

## Next Steps
- **Milestone 6a**: Flutter Mobile App Foundation (Design System, Tokens, GoRouter, Riverpod, Dio Interceptors, Localisation ARB, Auth Screens C01-C06).
