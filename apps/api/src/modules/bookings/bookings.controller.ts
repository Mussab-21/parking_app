import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles('DRIVER', 'ADMIN')
  @Post()
  async createBooking(
    @GetUser('id') userId: string,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingsService.createBooking(userId, dto, idempotencyKey);
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Get()
  async getUserBookings(@GetUser('id') userId: string) {
    return this.bookingsService.getUserBookings(userId);
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Get(':id')
  async getBookingById(
    @GetUser('id') userId: string,
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.getBookingById(userId, bookingId);
  }

  @Roles('DRIVER', 'ADMIN')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @GetUser('id') userId: string,
    @Param('id') bookingId: string,
    @Body() dto: CancelBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingsService.cancelBooking(
      userId,
      bookingId,
      dto,
      idempotencyKey,
    );
  }
}
