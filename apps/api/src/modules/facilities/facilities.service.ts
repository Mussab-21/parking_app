import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ApplyOwnerDto } from './dto/apply-owner.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { BulkSlotsDto } from './dto/bulk-slots.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  // Facility-Scoped Access Verification (IDOR Defense)
  async verifyFacilityAccess(userId: string, facilityId: string, allowedRoles: string[] = ['OWNER', 'ATTENDANT']) {
    if (!UUID_REGEX.test(facilityId)) {
      throw new NotFoundException('Facility not found');
    }

    // Admins have global access
    const userRes = await this.db.query(`SELECT "role" FROM "users" WHERE "id" = $1;`, [userId]);
    if (userRes.rows[0]?.role === 'ADMIN') {
      const facilityRes = await this.db.query(`SELECT * FROM "facilities" WHERE "id" = $1;`, [facilityId]);
      if (facilityRes.rows.length === 0) {
        throw new NotFoundException('Facility not found');
      }
      return facilityRes.rows[0];
    }

    const staffRes = await this.db.query(
      `SELECT fs."access_role", f.*
       FROM "facility_staff" fs
       JOIN "facilities" f ON f."id" = fs."facility_id"
       WHERE fs."facility_id" = $1 AND fs."user_id" = $2 AND fs."access_role"::text = ANY($3);`,
      [facilityId, userId, allowedRoles]
    );

    if (staffRes.rows.length === 0) {
      // Return 404 to avoid leaking existence of other owners' objects
      throw new NotFoundException('Facility not found');
    }

    return staffRes.rows[0];
  }

  // 1. OWNER APPLICATION
  async applyOwner(userId: string, dto: ApplyOwnerDto) {
    const existing = await this.db.query(`SELECT "id" FROM "owner_profiles" WHERE "user_id" = $1;`, [userId]);
    if (existing.rows.length > 0) {
      throw new ConflictException('Owner profile application already exists for this account');
    }

    const res = await this.db.query(
      `INSERT INTO "owner_profiles" ("user_id", "business_name", "verification_status", "documents")
       VALUES ($1, $2, 'PENDING', $3::jsonb)
       RETURNING *;`,
      [userId, dto.businessName, JSON.stringify(dto.documents || {})]
    );

    await this.auditService.log({
      actorId: userId,
      action: 'OWNER_APPLICATION_SUBMITTED',
      entityType: 'OWNER_PROFILE',
      entityId: res.rows[0].id,
      after: res.rows[0],
    });

    return res.rows[0];
  }

  // 2. ADMIN APPROVE/REJECT OWNER
  async approveOwner(adminId: string, ownerProfileId: string) {
    if (!UUID_REGEX.test(ownerProfileId)) throw new NotFoundException('Owner profile not found');

    const prev = await this.db.query(`SELECT * FROM "owner_profiles" WHERE "id" = $1;`, [ownerProfileId]);
    if (prev.rows.length === 0) throw new NotFoundException('Owner profile not found');

    const res = await this.db.query(
      `UPDATE "owner_profiles"
       SET "verification_status" = 'APPROVED', "reviewed_by" = $1, "reviewed_at" = NOW()
       WHERE "id" = $2
       RETURNING *;`,
      [adminId, ownerProfileId]
    );

    // Update user role to OWNER
    await this.db.query(`UPDATE "users" SET "role" = 'OWNER' WHERE "id" = $1;`, [prev.rows[0].user_id]);

    await this.auditService.log({
      actorId: adminId,
      action: 'OWNER_APPLICATION_APPROVED',
      entityType: 'OWNER_PROFILE',
      entityId: ownerProfileId,
      before: prev.rows[0],
      after: res.rows[0],
    });

    return res.rows[0];
  }

  async rejectOwner(adminId: string, ownerProfileId: string, reason?: string) {
    if (!UUID_REGEX.test(ownerProfileId)) throw new NotFoundException('Owner profile not found');

    const prev = await this.db.query(`SELECT * FROM "owner_profiles" WHERE "id" = $1;`, [ownerProfileId]);
    if (prev.rows.length === 0) throw new NotFoundException('Owner profile not found');

    const res = await this.db.query(
      `UPDATE "owner_profiles"
       SET "verification_status" = 'REJECTED', "reviewed_by" = $1, "reviewed_at" = NOW(), "rejection_reason" = $2
       WHERE "id" = $3
       RETURNING *;`,
      [adminId, reason || null, ownerProfileId]
    );

    await this.auditService.log({
      actorId: adminId,
      action: 'OWNER_APPLICATION_REJECTED',
      entityType: 'OWNER_PROFILE',
      entityId: ownerProfileId,
      before: prev.rows[0],
      after: res.rows[0],
    });

    return res.rows[0];
  }

  // 3. CREATE FACILITY
  async createFacility(userId: string, dto: CreateFacilityDto) {
    const res = await this.db.query(
      `INSERT INTO "facilities" (
        "name", "address", "city", "latitude", "longitude", "status",
        "hourly_rate_paisa", "opening_hours", "contact_phone", "photos"
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING_APPROVAL', $6, $7::jsonb, $8, $9)
      RETURNING *;`,
      [
        dto.name,
        dto.address,
        dto.city,
        dto.latitude,
        dto.longitude,
        dto.hourlyRatePaisa,
        JSON.stringify(dto.openingHours),
        dto.contactPhone,
        dto.photos || [],
      ]
    );

    const facility = res.rows[0];

    // Assign owner to facility_staff
    await this.db.query(
      `INSERT INTO "facility_staff" ("facility_id", "user_id", "access_role") VALUES ($1, $2, 'OWNER');`,
      [facility.id, userId]
    );

    await this.auditService.log({
      actorId: userId,
      action: 'FACILITY_CREATED',
      entityType: 'FACILITY',
      entityId: facility.id,
      after: facility,
    });

    return facility;
  }

  // 4. ADMIN APPROVE/REJECT/SUSPEND FACILITY
  async setFacilityStatus(adminId: string, facilityId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    if (!UUID_REGEX.test(facilityId)) throw new NotFoundException('Facility not found');

    const prev = await this.db.query(`SELECT * FROM "facilities" WHERE "id" = $1;`, [facilityId]);
    if (prev.rows.length === 0) throw new NotFoundException('Facility not found');

    const res = await this.db.query(
      `UPDATE "facilities"
       SET "status" = $1, "approved_by" = $2, "approved_at" = NOW()
       WHERE "id" = $3
       RETURNING *;`,
      [status, adminId, facilityId]
    );

    await this.auditService.log({
      actorId: adminId,
      action: `FACILITY_${status}`,
      entityType: 'FACILITY',
      entityId: facilityId,
      before: prev.rows[0],
      after: res.rows[0],
    });

    return res.rows[0];
  }

  // 5. LIST OWNER FACILITIES
  async getOwnerFacilities(userId: string) {
    const res = await this.db.query(
      `SELECT f.*, fs."access_role"
       FROM "facilities" f
       JOIN "facility_staff" fs ON fs."facility_id" = f."id"
       WHERE fs."user_id" = $1;`,
      [userId]
    );
    return res.rows;
  }

  // 6. UPDATE FACILITY (Optimistic Locking via version)
  async updateFacility(userId: string, facilityId: string, dto: UpdateFacilityDto) {
    const facility = await this.verifyFacilityAccess(userId, facilityId, ['OWNER']);

    const res = await this.db.query(
      `UPDATE "facilities"
       SET "name" = COALESCE($1, "name"),
           "address" = COALESCE($2, "address"),
           "city" = COALESCE($3, "city"),
           "hourly_rate_paisa" = COALESCE($4, "hourly_rate_paisa"),
           "opening_hours" = COALESCE($5::jsonb, "opening_hours"),
           "contact_phone" = COALESCE($6, "contact_phone"),
           "version" = "version" + 1,
           "updated_at" = NOW()
       WHERE "id" = $7 AND "version" = $8
       RETURNING *;`,
      [
        dto.name || null,
        dto.address || null,
        dto.city || null,
        dto.hourlyRatePaisa || null,
        dto.openingHours ? JSON.stringify(dto.openingHours) : null,
        dto.contactPhone || null,
        facilityId,
        dto.version,
      ]
    );

    if (res.rows.length === 0) {
      throw new ConflictException('Facility was updated by another session. Please reload current state.');
    }

    await this.auditService.log({
      actorId: userId,
      action: 'FACILITY_UPDATED',
      entityType: 'FACILITY',
      entityId: facilityId,
      before: facility,
      after: res.rows[0],
    });

    return res.rows[0];
  }

  // 7. CREATE ZONE
  async createZone(userId: string, facilityId: string, dto: CreateZoneDto) {
    await this.verifyFacilityAccess(userId, facilityId, ['OWNER']);

    const res = await this.db.query(
      `INSERT INTO "zones" ("facility_id", "name", "code", "rate_override_paisa")
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [facilityId, dto.name, dto.code, dto.rateOverridePaisa || null]
    );

    return res.rows[0];
  }

  // 8. BULK CREATE SLOTS
  async bulkCreateSlots(userId: string, facilityId: string, dto: BulkSlotsDto) {
    await this.verifyFacilityAccess(userId, facilityId, ['OWNER']);

    const slotsCreated = [];
    for (let i = 0; i < dto.count; i++) {
      const num = dto.startNumber + i;
      const slotCode = `${dto.prefix}-${num}`;

      const res = await this.db.query(
        `INSERT INTO "slots" ("facility_id", "zone_id", "slot_code", "vehicle_type", "status")
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         ON CONFLICT ("facility_id", "slot_code") DO NOTHING
         RETURNING *;`,
        [facilityId, dto.zoneId, slotCode, dto.vehicleType || 'CAR']
      );

      if (res.rows.length > 0) {
        slotsCreated.push(res.rows[0]);
      }
    }

    return {
      message: `Successfully created ${slotsCreated.length} slots`,
      slots: slotsCreated,
    };
  }

  // 9. PUBLIC DISCOVERY & DERIVED AVAILABILITY
  async searchFacilities(query?: string, city?: string) {
    let sql = `SELECT f.*,
                      (SELECT COUNT(*)::int FROM "slots" s WHERE s."facility_id" = f."id" AND s."status" = 'ACTIVE') as total_slots
               FROM "facilities" f
               WHERE f."status" = 'APPROVED'`;
    const params: any[] = [];

    if (city) {
      params.push(city);
      sql += ` AND f."city" ILIKE $${params.length}`;
    }

    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (f."name" ILIKE $${params.length} OR f."address" ILIKE $${params.length})`;
    }

    sql += ` ORDER BY f."created_at" DESC;`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getFacilityDetails(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('Facility not found');
    }

    const facilityRes = await this.db.query(`SELECT * FROM "facilities" WHERE "id" = $1 AND "status" = 'APPROVED';`, [id]);
    if (facilityRes.rows.length === 0) {
      throw new NotFoundException('Facility not found');
    }

    const zonesRes = await this.db.query(`SELECT * FROM "zones" WHERE "facility_id" = $1;`, [id]);

    return {
      facility: facilityRes.rows[0],
      zones: zonesRes.rows,
    };
  }

  // DERIVED AVAILABILITY CALCULATION (Section 10.4)
  async getDerivedAvailability(facilityId: string, startTimeStr: string, hours: number, zoneId?: string) {
    if (!UUID_REGEX.test(facilityId)) {
      throw new NotFoundException('Facility not found');
    }

    const startTime = new Date(startTimeStr);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    // Fetch facility
    const facilityRes = await this.db.query(`SELECT * FROM "facilities" WHERE "id" = $1;`, [facilityId]);
    if (facilityRes.rows.length === 0) throw new NotFoundException('Facility not found');
    const facility = facilityRes.rows[0];

    // Fetch slots
    let slotSql = `SELECT s.*, z."name" as zone_name, z."code" as zone_code
                   FROM "slots" s
                   JOIN "zones" z ON z."id" = s."zone_id"
                   WHERE s."facility_id" = $1`;
    const slotParams: any[] = [facilityId];

    if (zoneId) {
      slotParams.push(zoneId);
      slotSql += ` AND s."zone_id" = $2`;
    }

    const slotsRes = await this.db.query(slotSql, slotParams);
    const slots = slotsRes.rows;

    // Fetch overlapping active/pending/checked_in bookings in interval [startTime, endTime)
    const bookingsRes = await this.db.query(
      `SELECT "slot_id", "status"
       FROM "bookings"
       WHERE "facility_id" = $1
         AND "status" IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
         AND tstzrange("start_time", "end_time", '[)') && tstzrange($2, $3, '[)');`,
      [facilityId, startTime.toISOString(), endTime.toISOString()]
    );

    const bookingsBySlot = new Map<string, string>();
    bookingsRes.rows.forEach(b => {
      bookingsBySlot.set(b.slot_id, b.status);
    });

    const now = new Date();

    // Derive availability state for each slot
    let freeCount = 0;
    const derivedSlots = slots.map(slot => {
      let state: 'Available' | 'Reserved' | 'Occupied' | 'Unavailable';

      if (slot.status !== 'ACTIVE' || facility.status !== 'APPROVED') {
        state = 'Unavailable';
      } else {
        const bookingStatus = bookingsBySlot.get(slot.id);
        if (!bookingStatus) {
          state = 'Available';
          freeCount++;
        } else if (bookingStatus === 'CHECKED_IN' && now >= startTime && now < endTime) {
          state = 'Occupied';
        } else {
          state = 'Reserved';
        }
      }

      return {
        id: slot.id,
        slotCode: slot.slot_code,
        zoneId: slot.zone_id,
        zoneCode: slot.zone_code,
        zoneName: slot.zone_name,
        vehicleType: slot.vehicle_type,
        state,
      };
    });

    return {
      facilityId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      hours,
      totalSlots: slots.length,
      availableSlotsCount: freeCount,
      slots: derivedSlots,
    };
  }
}
