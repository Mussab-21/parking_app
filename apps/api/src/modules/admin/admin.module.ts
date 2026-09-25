import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FacilitiesModule } from '../facilities/facilities.module';

@Module({
  imports: [FacilitiesModule],
  controllers: [AdminController],
})
export class AdminModule {}
