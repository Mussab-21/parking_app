import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import {
  BookingStateMachine,
  BookingStatusType,
} from './booking-state-machine';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly db: DatabaseService) {}

  private hashPayload(payload: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  // 1. CREATE BOOKING (Hold)
  async createBooking(
    userId: string,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ) {
    const requestHash = this.hashPayload(dto);

    // Idempotency check
    if (idempotencyKey) {
      const keyRes = await this.db.query(
        `SELECT "response_status", "response_body", "request_hash"
         FROM "idempotency_keys"
         WHERE "user_id" = $1 AND "key" = $2;`,
        [userId, idempotencyKey],
      );

      if (keyRes.rows.length > 0) {
        const keyRow = keyRes.rows[0];
        if (keyRow.request_hash !== requestHash) {
          throw new ConflictException(
            'Idempotency key reused with different payload',
          );
        }
        return keyRow.response_body;
      }
    }

    // Load User
    const userRes = await this.db.query(
      `SELECT "name", "phone" FROM "users" WHERE "id" = $1;`,
      [userId],
    );
    if (userRes.rows.length === 0)
      throw new NotFoundException('User not found');
    const user = userRes.rows[0];

    // Load Vehicle
    const vehicleRes = await this.db.query(
      `SELECT "plate_raw", "plate_normalised" FROM "vehicles" WHERE "id" = $1 AND "user_id" = $2;`,
      [dto.vehicleId, userId],
    );
    if (vehicleRes.rows.length === 0)
      throw new NotFoundException('Vehicle not found for user');
    const vehicle = vehicleRes.rows[0];

    // Load Facility & Slot
    const facilityRes = await this.db.query(
      `SELECT "id", "name", "status", "hourly_rate_paisa" FROM "facilities" WHERE "id" = $1;`,
      [dto.facilityId],
    );
    if (facilityRes.rows.length === 0)
      throw new NotFoundException('Facility not found');
    const facility = facilityRes.rows[0];

    if (facility.status !== 'APPROVED') {
      throw new BadRequestException('Facility is not approved for bookings');
    }

    const slotRes = await this.db.query(
      `SELECT "id", "slot_code", "status" FROM "slots" WHERE "id" = $1 AND "facility_id" = $2;`,
      [dto.slotId, dto.facilityId],
    );
    if (slotRes.rows.length === 0)
      throw new NotFoundException('Slot not found in facility');
    const slot = slotRes.rows[0];

    if (slot.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Slot is currently under maintenance or disabled',
      );
    }

    // Time validation rules
    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime()))
      throw new BadRequestException('Invalid start time format');

    // 30-minute grid
    if (
      startTime.getMinutes() % 30 !== 0 ||
      startTime.getSeconds() !== 0 ||
      startTime.getMilliseconds() !== 0
    ) {
      throw new BadRequestException('Start time must be on a 30-minute grid');
    }

    const now = new Date();
    // Allow up to 5 minutes clock skew in past
    if (startTime.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    // Bookable up to 7 days ahead
    if (startTime.getTime() > now.getTime() + 7 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'Start time cannot be more than 7 days in advance',
      );
    }

    const durationHours = dto.durationHours;
    if (durationHours < 1 || durationHours > 12) {
      throw new BadRequestException('Duration must be between 1 and 12 hours');
    }

    const endTime = new Date(
      startTime.getTime() + durationHours * 60 * 60 * 1000,
    );

    // Calculate server price
    const hourlyRateSnapshot = BigInt(facility.hourly_rate_paisa);
    const amountPaisa = BigInt(durationHours) * hourlyRateSnapshot;
    const reference = `PB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. First expire stale holds on this slot
      await client.query(
        `UPDATE "bookings"
         SET "status" = 'EXPIRED'
         WHERE "slot_id" = $1 AND "status" = 'PENDING_PAYMENT' AND "hold_expires_at" < NOW();`,
        [dto.slotId],
      );

      // 2. Insert booking
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes hold

      const insertRes = await client.query(
        `INSERT INTO "bookings" (
          "reference", "user_id", "facility_id", "slot_id", "vehicle_id",
          "plate_snapshot", "name_snapshot", "phone_snapshot",
          "start_time", "end_time", "hourly_rate_paisa_snapshot", "amount_paisa",
          "status", "hold_expires_at"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          'PENDING_PAYMENT', $13
        ) RETURNING *;`,
        [
          reference,
          userId,
          dto.facilityId,
          dto.slotId,
          dto.vehicleId,
          vehicle.plate_raw,
          user.name,
          user.phone,
          startTime.toISOString(),
          endTime.toISOString(),
          hourlyRateSnapshot.toString(),
          amountPaisa.toString(),
          holdExpiresAt.toISOString(),
        ],
      );

      const booking = insertRes.rows[0];

      // 3. Write parking event
      await client.query(
        `INSERT INTO "parking_events" ("booking_id", "event_type", "actor_id", "facility_id", "metadata")
         VALUES ($1, 'BOOKING_HOLD_CREATED', $2, $3, $4::jsonb);`,
        [
          booking.id,
          userId,
          dto.facilityId,
          JSON.stringify({ holdExpiresAt: holdExpiresAt.toISOString() }),
        ],
      );

      const resultPayload = {
        id: booking.id,
        reference: booking.reference,
        facilityId: booking.facility_id,
        slotId: booking.slot_id,
        vehicleId: booking.vehicle_id,
        startTime: booking.start_time,
        endTime: booking.end_time,
        hourlyRatePaisa: booking.hourly_rate_paisa_snapshot.toString(),
        amountPaisa: booking.amount_paisa.toString(),
        amountPkr: Number(booking.amount_paisa) / 100,
        status: booking.status,
        holdExpiresAt: booking.hold_expires_at,
      };

      // 4. Record idempotency key
      if (idempotencyKey) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO "idempotency_keys" ("key", "user_id", "endpoint", "request_hash", "response_status", "response_body", "expires_at")
           VALUES ($1, $2, '/api/v1/bookings', $3, 201, $4::jsonb, $5);`,
          [
            idempotencyKey,
            userId,
            requestHash,
            JSON.stringify(resultPayload),
            expiresAt.toISOString(),
          ],
        );
      }

      await client.query('COMMIT');
      return resultPayload;
    } catch (err: any) {
      await client.query('ROLLBACK');

      // Catch PostgreSQL Exclusion Violation (Code 23P01) or constraint name
      if (err.code === '23P01' || err.constraint === 'bookings_no_overlap') {
        throw new ConflictException(
          'SLOT_UNAVAILABLE: That slot was just booked for the selected time. Please pick another slot.',
        );
      }

      throw err;
    } finally {
      client.release();
    }
  }

  // 2. CANCEL BOOKING
  async cancelBooking(
    userId: string,
    bookingId: string,
    dto: CancelBookingDto,
    idempotencyKey?: string,
  ) {
    const requestHash = this.hashPayload(dto);

    if (idempotencyKey) {
      const keyRes = await this.db.query(
        `SELECT "response_body" FROM "idempotency_keys" WHERE "user_id" = $1 AND "key" = $2;`,
        [userId, idempotencyKey],
      );
      if (keyRes.rows.length > 0) return keyRes.rows[0].response_body;
    }

    const bookingRes = await this.db.query(
      `SELECT * FROM "bookings" WHERE "id" = $1;`,
      [bookingId],
    );
    if (bookingRes.rows.length === 0)
      throw new NotFoundException('Booking not found');
    const booking = bookingRes.rows[0];

    // Check ownership
    if (booking.user_id !== userId) {
      const userRes = await this.db.query(
        `SELECT "role" FROM "users" WHERE "id" = $1;`,
        [userId],
      );
      if (userRes.rows[0]?.role !== 'ADMIN') {
        throw new NotFoundException('Booking not found');
      }
    }

    // Validate state transition
    BookingStateMachine.validateTransition(
      booking.status as BookingStatusType,
      'CANCELLED',
    );

    const now = new Date();
    const startTime = new Date(booking.start_time);
    const minutesUntilStart =
      (startTime.getTime() - now.getTime()) / (1000 * 60);

    // Policy: Full refund if cancelled >= 60 minutes before start_time
    const isRefundEligible =
      minutesUntilStart >= 60 && booking.status === 'CONFIRMED';
    const refundAmountPaisa = isRefundEligible
      ? booking.amount_paisa
      : BigInt(0);

    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update booking
      await client.query(
        `UPDATE "bookings"
         SET "status" = 'CANCELLED', "cancelled_at" = NOW(), "cancel_reason" = $1
         WHERE "id" = $2;`,
        [dto.reason || 'User cancelled', bookingId],
      );

      // Revoke active ticket if any
      await client.query(
        `UPDATE "tickets" SET "status" = 'REVOKED' WHERE "booking_id" = $1 AND "status" = 'ACTIVE';`,
        [bookingId],
      );

      // Write parking event
      await client.query(
        `INSERT INTO "parking_events" ("booking_id", "event_type", "actor_id", "facility_id", "metadata")
         VALUES ($1, 'BOOKING_CANCELLED', $2, $3, $4::jsonb);`,
        [
          bookingId,
          userId,
          booking.facility_id,
          JSON.stringify({
            isRefundEligible,
            refundAmountPaisa: refundAmountPaisa.toString(),
          }),
        ],
      );

      const resultPayload = {
        bookingId,
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        isRefundEligible,
        refundAmountPaisa: refundAmountPaisa.toString(),
        refundAmountPkr: Number(refundAmountPaisa) / 100,
        policyMessage: isRefundEligible
          ? 'Full refund eligible (cancelled >= 60 mins before start)'
          : 'No refund (cancelled < 60 mins before start or unpaid hold)',
      };

      if (idempotencyKey) {
        await client.query(
          `INSERT INTO "idempotency_keys" ("key", "user_id", "endpoint", "request_hash", "response_status", "response_body", "expires_at")
           VALUES ($1, $2, '/api/v1/bookings/cancel', $3, 200, $4::jsonb, NOW() + INTERVAL '24 hours');`,
          [idempotencyKey, userId, requestHash, JSON.stringify(resultPayload)],
        );
      }

      await client.query('COMMIT');
      return resultPayload;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 3. GET USER BOOKINGS
  async getUserBookings(userId: string) {
    const res = await this.db.query(
      `SELECT b.*, f."name" as facility_name, f."address" as facility_address, s."slot_code"
       FROM "bookings" b
       JOIN "facilities" f ON f."id" = b."facility_id"
       JOIN "slots" s ON s."id" = b."slot_id"
       WHERE b."user_id" = $1
       ORDER BY b."created_at" DESC;`,
      [userId],
    );
    return res.rows;
  }

  async getBookingById(userId: string, bookingId: string) {
    const res = await this.db.query(
      `SELECT b.*, f."name" as facility_name, f."address" as facility_address, s."slot_code"
       FROM "bookings" b
       JOIN "facilities" f ON f."id" = b."facility_id"
       JOIN "slots" s ON s."id" = b."slot_id"
       WHERE b."id" = $1;`,
      [bookingId],
    );

    if (res.rows.length === 0) throw new NotFoundException('Booking not found');
    const booking = res.rows[0];

    if (booking.user_id !== userId) {
      const userRes = await this.db.query(
        `SELECT "role" FROM "users" WHERE "id" = $1;`,
        [userId],
      );
      if (userRes.rows[0]?.role !== 'ADMIN') {
        throw new NotFoundException('Booking not found');
      }
    }

    return booking;
  }
}
