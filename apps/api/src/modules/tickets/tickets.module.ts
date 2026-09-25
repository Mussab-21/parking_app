import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { StaffController } from './staff.controller';

@Module({
  providers: [TicketsService],
  controllers: [StaffController],
  exports: [TicketsService],
})
export class TicketsModule {}
