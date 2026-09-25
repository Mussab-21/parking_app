import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import * as argon2 from 'argon2';

@Controller('api/v1/me')
export class MeController {
  constructor(private readonly db: DatabaseService) {}

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Get()
  async getProfile(@GetUser('id') userId: string) {
    const res = await this.db.query(
      `SELECT "id", "name", "phone", "email", "role", "status", "created_at"
       FROM "users" WHERE "id" = $1;`,
      [userId],
    );
    return res.rows[0];
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Patch()
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() body: { name?: string; email?: string },
  ) {
    const res = await this.db.query(
      `UPDATE "users"
       SET "name" = COALESCE($1, "name"), "email" = COALESCE($2, "email"), "updated_at" = NOW()
       WHERE "id" = $3
       RETURNING "id", "name", "phone", "email", "role", "status";`,
      [body.name || null, body.email || null, userId],
    );
    return res.rows[0];
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Post('change-password')
  async changePassword(
    @GetUser('id') userId: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    const userRes = await this.db.query(
      `SELECT "password_hash" FROM "users" WHERE "id" = $1;`,
      [userId],
    );
    const valid = await argon2.verify(
      userRes.rows[0].password_hash,
      body.oldPassword,
    );
    if (!valid) {
      throw new Error('Current password incorrect');
    }

    const newHash = await argon2.hash(body.newPassword, {
      type: argon2.argon2id,
    });
    await this.db.query(
      `UPDATE "users" SET "password_hash" = $1 WHERE "id" = $2;`,
      [newHash, userId],
    );

    // Revoke all refresh tokens
    await this.db.query(
      `UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "user_id" = $1;`,
      [userId],
    );

    return { message: 'Password updated successfully' };
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Get('vehicles')
  async getVehicles(@GetUser('id') userId: string) {
    const res = await this.db.query(
      `SELECT "id", "plate_raw", "plate_normalised", "make", "model", "color"
       FROM "vehicles" WHERE "user_id" = $1;`,
      [userId],
    );
    return res.rows;
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Post('vehicles')
  async addVehicle(
    @GetUser('id') userId: string,
    @Body()
    body: { plate: string; make?: string; model?: string; color?: string },
  ) {
    const plateRaw = body.plate.trim();
    const plateNormalised = plateRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const res = await this.db.query(
      `INSERT INTO "vehicles" ("user_id", "plate_raw", "plate_normalised", "make", "model", "color")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "id", "plate_raw", "plate_normalised", "make", "model", "color";`,
      [
        userId,
        plateRaw,
        plateNormalised,
        body.make || null,
        body.model || null,
        body.color || null,
      ],
    );
    return res.rows[0];
  }

  @Roles('DRIVER', 'ATTENDANT', 'OWNER', 'ADMIN')
  @Delete('vehicles/:id')
  async deleteVehicle(
    @GetUser('id') userId: string,
    @Param('id') vehicleId: string,
  ) {
    await this.db.query(
      `DELETE FROM "vehicles" WHERE "id" = $1 AND "user_id" = $2;`,
      [vehicleId, userId],
    );
    return { message: 'Vehicle removed' };
  }
}
