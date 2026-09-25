import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(private readonly db: DatabaseService) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 1. ISSUE QR TICKET ON CONFIRMATION
  async issueTicket(bookingId: string) {
    const bookingRes = await this.db.query(
      `SELECT "start_time" FROM "bookings" WHERE "id" = $1;`,
      [bookingId],
    );
    if (bookingRes.rows.length === 0)
      throw new NotFoundException('Booking not found');

    const startTime = new Date(bookingRes.rows[0].start_time);
    // Valid from current moment or 15 mins before start time
    const validFrom = new Date(Math.min(Date.now(), startTime.getTime() - 15 * 60 * 1000));
    const validUntil = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // Generous demo window

    const rawToken = `PSP1.TICKET_${bookingId}`;
    const tokenHash = this.hashToken(rawToken);

    // Revoke any existing active tickets for this booking
    await this.db.query(
      `UPDATE "tickets" SET "status" = 'REVOKED' WHERE "booking_id" = $1 AND "status" = 'ACTIVE';`,
      [bookingId],
    );

    const ticketRes = await this.db.query(
      `INSERT INTO "tickets" ("booking_id", "token_hash", "valid_from", "valid_until", "status")
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING *;`,
      [bookingId, tokenHash, validFrom.toISOString(), validUntil.toISOString()],
    );

    return {
      ticketId: ticketRes.rows[0].id,
      bookingId,
      rawToken,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
    };
  }

  // 2. ATTENDANT SCAN QR TICKET
  async scanTicket(attendantUserId: string, rawToken: string) {
    const trimmed = rawToken.trim();
    const tokenHash = this.hashToken(trimmed);

    // Query ticket by token_hash OR check if rawToken is bookingId / reference
    const ticketRes = await this.db.query(
      `SELECT t.*, b."id" as booking_id, b."facility_id", b."status" as booking_status,
              b."plate_snapshot", b."name_snapshot", b."phone_snapshot", b."start_time", b."end_time", s."slot_code"
       FROM "tickets" t
       JOIN "bookings" b ON b."id" = t."booking_id"
       JOIN "slots" s ON s."id" = b."slot_id"
       WHERE t."token_hash" = $1
          OR b."id"::text = $2
          OR b."reference" = $2
       ORDER BY t."created_at" DESC
       LIMIT 1;`,
      [tokenHash, trimmed.replace('PSP1.TICKET_', '')],
    );

    if (ticketRes.rows.length === 0) {
      throw new BadRequestException(
        'INVALID_QR: Ticket does not exist or has been tampered with',
      );
    }

    const ticket = ticketRes.rows[0];

    // Facility Scope Check for Attendant
    const userRes = await this.db.query(
      `SELECT "role" FROM "users" WHERE "id" = $1;`,
      [attendantUserId],
    );
    if (userRes.rows[0]?.role !== 'ADMIN') {
      const staffRes = await this.db.query(
        `SELECT "access_role" FROM "facility_staff" WHERE "facility_id" = $1 AND "user_id" = $2;`,
        [ticket.facility_id, attendantUserId],
      );
      if (staffRes.rows.length === 0) {
        throw new ForbiddenException(
          'WRONG_FACILITY: QR ticket is for another facility',
        );
      }
    }

    // If already checked in, return state so attendant can offer exit
    if (ticket.booking_status === 'CHECKED_IN') {
      return {
        result: 'ALREADY_CHECKED_IN',
        bookingId: ticket.booking_id,
        slotCode: ticket.slot_code,
        plate: ticket.plate_snapshot,
        driverName: ticket.name_snapshot,
        startTime: ticket.start_time,
        endTime: ticket.end_time,
      };
    }

    if (ticket.status !== 'ACTIVE' || ticket.booking_status !== 'CONFIRMED') {
      throw new BadRequestException(
        `INVALID_STATUS: Booking status is ${ticket.booking_status}`,
      );
    }

    // ATOMIC UPDATE: Single-use enforcement
    const updateRes = await this.db.query(
      `UPDATE "tickets"
       SET "status" = 'USED', "used_at" = NOW()
       WHERE "id" = $1 AND "status" = 'ACTIVE'
       RETURNING "id";`,
      [ticket.id],
    );

    if (updateRes.rows.length === 0) {
      throw new BadRequestException(
        'ALREADY_USED: Ticket was scanned in a concurrent request',
      );
    }

    // Move booking to CHECKED_IN
    await this.db.query(
      `UPDATE "bookings" SET "status" = 'CHECKED_IN', "checked_in_at" = NOW() WHERE "id" = $1;`,
      [ticket.booking_id],
    );

    // Write parking event
    await this.db.query(
      `INSERT INTO "parking_events" ("booking_id", "event_type", "actor_id", "facility_id")
       VALUES ($1, 'ENTRY_CONFIRMED', $2, $3);`,
      [ticket.booking_id, attendantUserId, ticket.facility_id],
    );

    return {
      result: 'VALID',
      bookingId: ticket.booking_id,
      slotCode: ticket.slot_code,
      plate: ticket.plate_snapshot,
      driverName: ticket.name_snapshot,
      startTime: ticket.start_time,
      endTime: ticket.end_time,
    };
  }

  // 3. EXIT SESSION & OVERSTAY COMPUTATION
  async exitSession(attendantUserId: string, bookingId: string) {
    const bookingRes = await this.db.query(
      `SELECT * FROM "bookings" WHERE "id" = $1;`,
      [bookingId],
    );
    if (bookingRes.rows.length === 0)
      throw new NotFoundException('Booking not found');

    const booking = bookingRes.rows[0];

    if (booking.status !== 'CHECKED_IN') {
      throw new BadRequestException(
        `Cannot exit session: Booking status is ${booking.status}`,
      );
    }

    // Attendant Facility Scope Check
    const userRes = await this.db.query(
      `SELECT "role" FROM "users" WHERE "id" = $1;`,
      [attendantUserId],
    );
    if (userRes.rows[0]?.role !== 'ADMIN') {
      const staffRes = await this.db.query(
        `SELECT "access_role" FROM "facility_staff" WHERE "facility_id" = $1 AND "user_id" = $2;`,
        [booking.facility_id, attendantUserId],
      );
      if (staffRes.rows.length === 0) {
        throw new ForbiddenException('Attendant not assigned to this facility');
      }
    }

    const actualExitAt = new Date();
    const endTime = new Date(booking.end_time);
    const graceEndTime = new Date(endTime.getTime() + 10 * 60 * 1000); // 10-min grace

    let overstayHours = 0;
    let overstayAmountPaisa = BigInt(0);

    if (actualExitAt > graceEndTime) {
      const overstayMs = actualExitAt.getTime() - endTime.getTime();
      overstayHours = Math.ceil(overstayMs / (1000 * 60 * 60));
      const hourlyRate = BigInt(booking.hourly_rate_paisa_snapshot);
      overstayAmountPaisa = BigInt(overstayHours) * hourlyRate;
    }

    // Complete booking
    await this.db.query(
      `UPDATE "bookings"
       SET "status" = 'COMPLETED', "actual_exit_at" = $1, "overstay_amount_paisa" = $2
       WHERE "id" = $3;`,
      [actualExitAt.toISOString(), overstayAmountPaisa.toString(), bookingId],
    );

    // Write parking event
    await this.db.query(
      `INSERT INTO "parking_events" ("booking_id", "event_type", "actor_id", "facility_id", "metadata")
       VALUES ($1, 'EXIT_CONFIRMED', $2, $3, $4::jsonb);`,
      [
        bookingId,
        attendantUserId,
        booking.facility_id,
        JSON.stringify({
          overstayHours,
          overstayAmountPaisa: overstayAmountPaisa.toString(),
        }),
      ],
    );

    return {
      bookingId,
      status: 'COMPLETED',
      actualExitAt: actualExitAt.toISOString(),
      overstayHours,
      overstayAmountPaisa: overstayAmountPaisa.toString(),
      overstayAmountPkr: Number(overstayAmountPaisa) / 100,
    };
  }
}
