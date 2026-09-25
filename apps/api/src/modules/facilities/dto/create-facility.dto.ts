import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateFacilityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  hourlyRatePaisa: number;

  @IsObject()
  openingHours: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsArray()
  @IsOptional()
  photos?: string[];
}
