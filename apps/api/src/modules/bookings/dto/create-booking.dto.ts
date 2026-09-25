import {
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  facilityId: string;

  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsISO8601()
  @IsNotEmpty()
  startTime: string;

  @IsInt()
  @Min(1, { message: 'Booking duration must be at least 1 hour' })
  @Max(12, { message: 'Booking duration cannot exceed 12 hours' })
  durationHours: number;
}
