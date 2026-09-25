import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider.interface';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly ticketsService: TicketsService,
  ) {}

  // 1. CREATE CHECKOUT SESSION
  async createCheckoutSession(userId: string, bookingId: string, idempotencyKey?: string) {
    const bookingRes = await this.db.query(`SELECT * FROM "bookings" WHERE "id" = $1;`, [bookingId]);
    if (bookingRes.rows.length === 0) throw new NotFoundException('Booking not found');

    const booking = bookingRes.rows[0];
    if (booking.user_id !== userId) throw new NotFoundException('Booking not found');

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(`Cannot initiate payment for booking with status ${booking.status}`);
    }

    const amountPaisa = Number(booking.amount_paisa);

    const providerOrder = await this.paymentProvider.createOrder({
      bookingId,
      amountPaisa,
      currency: 'PKR',
      idempotencyKey,
    });

    // Record payment row
    await this.db.query(
      `INSERT INTO "payments" (
        "booking_id", "kind", "amount_paisa", "currency", "provider",
        "provider_reference", "status", "platform_fee_paisa", "owner_amount_paisa"
      ) VALUES ($1, 'BOOKING', $2, 'PKR', 'MOCK_PROVIDER', $3, 'CREATED', 0, $2)
      ON CONFLICT ("provider", "provider_reference") DO NOTHING;`,
      [bookingId, amountPaisa, providerOrder.providerReference]
    );

    return providerOrder;
  }

  // 2. SIGNATURE-VERIFIED WEBHOOK HANDLER
  async processWebhook(provider: string, rawBody: Buffer, headers: Record<string, any>) {
    const verification = this.paymentProvider.verifyWebhook(rawBody, headers);

    if (!verification.valid || !verification.event) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = verification.event;

    // Replay protection: Insert into payment_events with unique index
    const eventRes = await this.db.query(
      `INSERT INTO "payment_events" ("provider", "provider_event_id", "payload", "signature_valid")
       VALUES ($1, $2, $3::jsonb, true)
       ON CONFLICT ("provider", "provider_event_id") DO NOTHING
       RETURNING "id";`,
      [provider, event.providerEventId, rawBody.toString('utf8')]
    );

    if (eventRes.rows.length === 0) {
      this.logger.log(`[WEBHOOK] Duplicate event ${event.providerEventId} ignored.`);
      return { status: 'PROCESSED', message: 'Duplicate webhook event ignored' };
    }

    const pool = this.db.getPool();
    const client = await pool.connect();

    let outcome: { status: string; message?: string; issueTicket?: boolean } = { status: 'PROCESSED' };

    try {
      await client.query('BEGIN');

      // Lock booking & payment rows
      const bookingRes = await client.query(
        `SELECT * FROM "bookings" WHERE "id" = $1 FOR UPDATE;`,
        [event.bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw new NotFoundException('Booking not found for payment webhook');
      }

      const booking = bookingRes.rows[0];

      // Update payment status
      await client.query(
        `UPDATE "payments"
         SET "status" = 'SUCCEEDED', "updated_at" = NOW()
         WHERE "booking_id" = $1;`,
        [event.bookingId]
      );

      const now = new Date();

      // CASE A: Booking is PENDING_PAYMENT and hold not expired
      if (booking.status === 'PENDING_PAYMENT' && new Date(booking.hold_expires_at) >= now) {
        await client.query(`UPDATE "bookings" SET "status" = 'CONFIRMED' WHERE "id" = $1;`, [event.bookingId]);

        await client.query(
          `INSERT INTO "parking_events" ("booking_id", "event_type", "facility_id")
           VALUES ($1, 'PAYMENT_RECEIVED_CONFIRMED', $2);`,
          [event.bookingId, booking.facility_id]
        );

        outcome = { status: 'CONFIRMED', issueTicket: true };
      }
      // CASE B: Late Payment Recovery (Booking was EXPIRED)
      else if (booking.status === 'EXPIRED') {
        // Check if slot is still free
        const overlapRes = await client.query(
          `SELECT "id" FROM "bookings"
           WHERE "slot_id" = $1 AND "id" != $2
             AND "status" IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
             AND tstzrange("start_time", "end_time", '[)') && tstzrange($3, $4, '[)');`,
          [booking.slot_id, booking.id, booking.start_time, booking.end_time]
        );

        if (overlapRes.rows.length === 0) {
          // Sub-case B1: Slot is free -> Re-confirm booking!
          await client.query(`UPDATE "bookings" SET "status" = 'CONFIRMED' WHERE "id" = $1;`, [booking.id]);

          await client.query(
            `INSERT INTO "parking_events" ("booking_id", "event_type", "facility_id")
             VALUES ($1, 'LATE_PAYMENT_RECONFIRMED', $2);`,
            [booking.id, booking.facility_id]
          );

          outcome = { status: 'RE_CONFIRMED', issueTicket: true };
        } else {
          // Sub-case B2: Slot was taken -> Automatic Refund Row!
          await client.query(
            `UPDATE "payments" SET "status" = 'REFUND_REQUIRED' WHERE "booking_id" = $1;`,
            [booking.id]
          );

          const payRes = await client.query(`SELECT "id" FROM "payments" WHERE "booking_id" = $1 LIMIT 1;`, [booking.id]);
          if (payRes.rows.length > 0) {
            await client.query(
              `INSERT INTO "refunds" ("payment_id", "amount_paisa", "status", "reason")
               VALUES ($1, $2, 'PENDING', 'Slot taken after hold expired');`,
              [payRes.rows[0].id, booking.amount_paisa]
            );
          }

          await client.query(
            `INSERT INTO "parking_events" ("booking_id", "event_type", "facility_id")
             VALUES ($1, 'LATE_PAYMENT_REFUND_REQUIRED', $2);`,
            [booking.id, booking.facility_id]
          );

          outcome = { status: 'REFUND_REQUIRED', message: 'Slot taken after hold expired. Automatic refund created.' };
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Issue ticket OUTSIDE the transaction lock to avoid deadlocks
    if (outcome.issueTicket) {
      await this.ticketsService.issueTicket(event.bookingId);
      return { status: outcome.status, ticketIssued: true };
    }

    return outcome;
  }
}
