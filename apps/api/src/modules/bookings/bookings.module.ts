import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingJobsService } from './booking-jobs.service';

@Module({
  providers: [BookingsService, BookingJobsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
