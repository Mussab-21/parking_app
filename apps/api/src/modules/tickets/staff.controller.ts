import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ScanQrDto } from './dto/scan-qr.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('api/v1/staff')
export class StaffController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Roles('ATTENDANT', 'OWNER', 'ADMIN')
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanTicket(
    @GetUser('id') attendantUserId: string,
    @Body() dto: ScanQrDto,
  ) {
    return this.ticketsService.scanTicket(attendantUserId, dto.qrToken);
  }

  @Roles('ATTENDANT', 'OWNER', 'ADMIN')
  @Post('exit/:bookingId')
  @HttpCode(HttpStatus.OK)
  async exitSession(
    @GetUser('id') attendantUserId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.ticketsService.exitSession(attendantUserId, bookingId);
  }
}
