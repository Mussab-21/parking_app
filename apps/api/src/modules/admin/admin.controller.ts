import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FacilitiesService } from '../facilities/facilities.service';
import { DatabaseService } from '../database/database.service';
import { ApprovalDto } from './dto/approval.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly facilitiesService: FacilitiesService,
    private readonly db: DatabaseService,
  ) {}

  @Roles('ADMIN')
  @Post('owners/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveOwner(
    @GetUser('id') adminId: string,
    @Param('id') ownerProfileId: string,
  ) {
    return this.facilitiesService.approveOwner(adminId, ownerProfileId);
  }

  @Roles('ADMIN')
  @Post('owners/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectOwner(
    @GetUser('id') adminId: string,
    @Param('id') ownerProfileId: string,
    @Body() dto: ApprovalDto,
  ) {
    return this.facilitiesService.rejectOwner(
      adminId,
      ownerProfileId,
      dto.reason,
    );
  }

  @Roles('ADMIN')
  @Post('facilities/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveFacility(
    @GetUser('id') adminId: string,
    @Param('id') facilityId: string,
  ) {
    return this.facilitiesService.setFacilityStatus(
      adminId,
      facilityId,
      'APPROVED',
    );
  }

  @Roles('ADMIN')
  @Post('facilities/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectFacility(
    @GetUser('id') adminId: string,
    @Param('id') facilityId: string,
  ) {
    return this.facilitiesService.setFacilityStatus(
      adminId,
      facilityId,
      'REJECTED',
    );
  }

  @Roles('ADMIN')
  @Post('facilities/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendFacility(
    @GetUser('id') adminId: string,
    @Param('id') facilityId: string,
  ) {
    return this.facilitiesService.setFacilityStatus(
      adminId,
      facilityId,
      'SUSPENDED',
    );
  }

  @Roles('ADMIN')
  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const sizeNum = Math.min(parseInt(pageSize, 10) || 20, 100);
    const offset = (pageNum - 1) * sizeNum;

    const res = await this.db.query(
      `SELECT * FROM "audit_logs" ORDER BY "created_at" DESC LIMIT $1 OFFSET $2;`,
      [sizeNum, offset],
    );

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM "audit_logs";`,
    );

    return {
      data: res.rows,
      total: countRes.rows[0].total,
      page: pageNum,
      pageSize: sizeNum,
    };
  }
}
