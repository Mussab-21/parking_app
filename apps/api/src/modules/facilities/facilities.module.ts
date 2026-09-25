import { Module } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { OwnerController } from './owner.controller';
import { DiscoveryController } from './discovery.controller';

@Module({
  providers: [FacilitiesService],
  controllers: [OwnerController, DiscoveryController],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
