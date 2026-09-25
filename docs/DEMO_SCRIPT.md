# ParkSmart - End-to-End Demo Script (Section 16.3)

This script walks through all 8 end-to-end scenarios required by the Master Build Prompt.

---

## Scenario 1: Driver Registration, Discovery, Booking & Payment
1. **Register**: Driver opens Flutter app, enters name "Demonstration Driver", phone `+923008889999`, and password `Password123!`.
2. **Verify OTP**: Enters code `123456` sent via OTP adapter.
3. **Discover**: Driver browses nearby facilities and selects "Demo Plaza".
4. **Select Slot**: Chooses Zone `AB`, slot `AB-1` for a duration of 2 hours.
5. **Review Summary**: Total displayed: `PKR 400` (`40,000 paisa`). Starts 10-minute hold.
6. **Pay**: Selects Mock Payment method and completes payment.
7. **QR Ticket**: High-contrast QR ticket (`PSP1.<token>`) appears on screen and is saved locally to offline storage.

---

## Scenario 2: Attendant QR Entry Scan & Re-scan Rejection
1. **Scan Entry**: Attendant opens Attendant Mode on Flutter app (`/staff/scan`) and scans driver's QR ticket.
2. **Result**: App displays `VALID` banner with slot `AB-1`, car plate, and driver name. Booking transitions to `CHECKED_IN`.
3. **Re-scan Rejection**: Attendant scans the same QR ticket again. App displays `INVALID / ALREADY_USED` error because tickets are single-use.

---

## Scenario 3: Slot Overlap & Concurrency Conflict Defense
1. **Race Condition**: Driver A and Driver B attempt to book slot `AB-1` for 10:00 - 12:00 simultaneously.
2. **Database Exclusion**: PostgreSQL `bookings_no_overlap` constraint accepts Driver A's booking (201 Created) and rejects Driver B's booking with `409 SLOT_UNAVAILABLE`.
3. **User Message**: Driver B sees "That slot was just booked. Please pick another slot."

---

## Scenario 4: Booking Hold Timeout & Release
1. **Hold Created**: Driver initiates booking for slot `AB-2` (10-minute hold).
2. **Abandonment**: Driver abandons checkout.
3. **Cron Expiry**: `@nestjs/schedule` cron job runs after 10 minutes, sets booking status to `EXPIRED`, and frees slot `AB-2` for other drivers.

---

## Scenario 5: Cancellation Policy Evaluation
1. **Early Cancellation (>= 60 mins before start)**: Driver cancels booking 3 hours before start time. System sets status `CANCELLED`, marks booking eligible for full refund (`refundAmountPkr = 400`), and revokes QR ticket.
2. **Late Cancellation (< 60 mins before start)**: Driver cancels booking 20 minutes before start time. System sets status `CANCELLED` and marks no refund per policy.

---

## Scenario 6: Overstay Computation at Exit
1. **Driver Exits Late**: Driver checks in at 10:00 for a 1-hour booking (ending 11:00). Driver exits at 12:30 PM (90 minutes past grace period).
2. **Attendant Exit**: Attendant taps "Exit Session" (`POST /staff/exit/:bookingId`).
3. **Overstay Charge**: System computes `overstayHours = 2`, calculates additional charge `PKR 400` (`40,000 paisa`), updates booking to `COMPLETED`, and logs `EXIT_CONFIRMED` event.

---

## Scenario 7: Owner Application & Admin Approval Workflow
1. **Owner Application**: User applies as owner (`POST /owner/apply`) with business name "Karachi Parking Ltd.". Status set to `PENDING`.
2. **Admin Approval**: Admin reviews application in Admin Portal (`/admin/owners`) and clicks "Approve". User's role updates to `OWNER`.
3. **Facility & Slot Creation**: Owner creates "Karachi Plaza", bulk creates 20 slots (`KP-1` to `KP-20`).
4. **Admin Facility Approval**: Admin approves "Karachi Plaza". Facility and slots become live in driver mobile app discovery.

---

## Scenario 8: Admin Refund & Audit Trail
1. **Refund**: Admin initiates a refund for a disputed booking in Admin Portal.
2. **Ticket Revocation**: Active QR ticket is automatically revoked.
3. **Audit Log**: Append-only entry is recorded in `audit_logs` table (`action = 'REFUND_PROCESSED'`).
