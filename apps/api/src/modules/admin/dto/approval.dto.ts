import { IsString, IsOptional } from 'class-validator';

export class ApprovalDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
