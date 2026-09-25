import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsOptional()
  rateOverridePaisa?: number;
}
