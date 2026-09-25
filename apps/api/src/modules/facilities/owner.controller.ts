import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { ApplyOwnerDto } from './dto/apply-owner.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { BulkSlotsDto } from './dto/bulk-slots.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('api/v1/owner')
export class OwnerController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Roles('DRIVER', 'OWNER')
  @Post('apply')
  async applyOwner(@GetUser('id') userId: string, @Body() dto: ApplyOwnerDto) {
    return this.facilitiesService.applyOwner(userId, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('facilities')
  async createFacility(
    @GetUser('id') userId: string,
    @Body() dto: CreateFacilityDto,
  ) {
    return this.facilitiesService.createFacility(userId, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Get('facilities')
  async getOwnerFacilities(@GetUser('id') userId: string) {
    return this.facilitiesService.getOwnerFacilities(userId);
  }

  @Roles('OWNER', 'ADMIN')
  @Get('facilities/:id')
  async getFacilityDetails(
    @GetUser('id') userId: string,
    @Param('id') facilityId: string,
  ) {
    return this.facilitiesService.verifyFacilityAccess(userId, facilityId);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch('facilities/:id')
  async updateFacility(
    @GetUser('id') userId: string,
    @Param('id') facilityId: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.updateFacility(userId, facilityId, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('facilities/:id/zones')
  async createZone(
    @GetUser('id') userId: string,
    @Param('id') facilityId: string,
    @Body() dto: CreateZoneDto,
  ) {
    return this.facilitiesService.createZone(userId, facilityId, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('facilities/:id/slots/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkCreateSlots(
    @GetUser('id') userId: string,
    @Param('id') facilityId: string,
    @Body() dto: BulkSlotsDto,
  ) {
    return this.facilitiesService.bulkCreateSlots(userId, facilityId, dto);
  }
}
