import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be in E.164 format (+923XXXXXXXXX)',
  })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;
}
