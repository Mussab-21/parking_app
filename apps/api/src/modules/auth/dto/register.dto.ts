import {
  IsString,
  IsNotEmpty,
  Matches,
  IsEmail,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';

export enum UserRoleDto {
  DRIVER = 'DRIVER',
  OWNER = 'OWNER',
  ATTENDANT = 'ATTENDANT',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be in E.164 format (+923XXXXXXXXX)',
  })
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  password: string;

  @IsEnum(UserRoleDto)
  @IsOptional()
  role?: UserRoleDto;
}
