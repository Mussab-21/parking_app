import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BookingJobsService {
  private readonly logger = new Logger(BookingJobsService.name);

  constructor(private readonly db: DatabaseService) {}

  // Run every 30 seconds
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleStaleHoldsAndNoShows() {
    try {
      // 1. Expire Stale Holds
      const expiredHoldsRes = await this.db.query(
        `UPDATE "bookings"
         SET "status" = 'EXPIRED', "updated_at" = NOW()
         WHERE "status" = 'PENDING_PAYMENT' AND "hold_expires_at" < NOW()
         RETURNING "id", "slot_id", "facility_id";`,
      );

      if (expiredHoldsRes.rows.length > 0) {
        this.logger.log(
          `[CRON] Expired ${expiredHoldsRes.rows.length} stale booking holds.`,
        );
        for (const booking of expiredHoldsRes.rows) {
          await this.db.query(
            `INSERT INTO "parking_events" ("booking_id", "event_type", "facility_id")
             VALUES ($1, 'HOLD_EXPIRED', $2);`,
            [booking.id, booking.facility_id],
          );
        }
      }

      // 2. Mark No-Shows (CONFIRMED bookings past start_time + 30 minutes grace)
      const noShowsRes = await this.db.query(
        `UPDATE "bookings"
         SET "status" = 'NO_SHOW', "updated_at" = NOW()
         WHERE "status" = 'CONFIRMED' AND ("start_time" + INTERVAL '30 minutes') < NOW()
         RETURNING "id", "facility_id";`,
      );

      if (noShowsRes.rows.length > 0) {
        this.logger.log(
          `[CRON] Marked ${noShowsRes.rows.length} bookings as NO_SHOW.`,
        );
        for (const booking of noShowsRes.rows) {
          await this.db.query(
            `INSERT INTO "parking_events" ("booking_id", "event_type", "facility_id")
             VALUES ($1, 'MARKED_NO_SHOW', $2);`,
            [booking.id, booking.facility_id],
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `[CRON ERROR] handleStaleHoldsAndNoShows failed: ${err.message}`,
      );
    }
  }
}
