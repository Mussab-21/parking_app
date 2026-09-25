import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class ApplyOwnerDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsObject()
  @IsOptional()
  documents?: Record<string, any>;
}
