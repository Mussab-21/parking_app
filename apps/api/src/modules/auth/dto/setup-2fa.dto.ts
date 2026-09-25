import { IsString, Length } from 'class-validator';

export class Verify2FaDto {
  @IsString()
  @Length(6, 6)
  totpCode: string;
}
