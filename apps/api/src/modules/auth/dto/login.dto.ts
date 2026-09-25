import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Phone or Email

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  totpCode?: string; // Optional TOTP code for 2FA
}
