import { IsString, IsNotEmpty } from 'class-validator';

export class ScanQrDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;
}
