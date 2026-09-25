import {
  IsString,
  IsNotEmpty,
  Matches,
  Length,
  MinLength,
} from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be in E.164 format (+923XXXXXXXXX)',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be in E.164 format (+923XXXXXXXXX)',
  })
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  newPassword: string;
}
