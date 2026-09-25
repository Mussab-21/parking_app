import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum VehicleTypeDto {
  CAR = 'CAR',
  BIKE = 'BIKE',
  VAN = 'VAN',
}

export class BulkSlotsDto {
  @IsString()
  @IsNotEmpty()
  zoneId: string;

  @IsString()
  @IsNotEmpty()
  prefix: string;

  @IsNumber()
  startNumber: number;

  @IsNumber()
  count: number;

  @IsEnum(VehicleTypeDto)
  @IsOptional()
  vehicleType?: VehicleTypeDto;
}
