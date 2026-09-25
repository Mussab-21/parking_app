import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';

export class UpdateFacilityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  hourlyRatePaisa?: number;

  @IsObject()
  @IsOptional()
  openingHours?: Record<string, any>;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsNumber()
  version: number;
}
