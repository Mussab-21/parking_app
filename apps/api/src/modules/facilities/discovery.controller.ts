import { Controller, Get, Param, Query } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/facilities')
export class DiscoveryController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Public()
  @Get()
  async searchFacilities(
    @Query('query') query?: string,
    @Query('city') city?: string,
  ) {
    return this.facilitiesService.searchFacilities(query, city);
  }

  @Public()
  @Get(':id')
  async getFacilityDetails(@Param('id') facilityId: string) {
    return this.facilitiesService.getFacilityDetails(facilityId);
  }

  @Public()
  @Get(':id/availability')
  async getAvailability(
    @Param('id') facilityId: string,
    @Query('start') startTime: string,
    @Query('hours') hours = '1',
    @Query('zoneId') zoneId?: string,
  ) {
    const hoursNum = parseInt(hours, 10) || 1;
    return this.facilitiesService.getDerivedAvailability(
      facilityId,
      startTime || new Date().toISOString(),
      hoursNum,
      zoneId,
    );
  }
}
