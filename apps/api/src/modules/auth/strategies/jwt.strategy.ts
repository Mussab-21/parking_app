import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  status: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const res = await this.db.query(
      `SELECT "id", "name", "phone", "email", "role", "status" FROM "users" WHERE "id" = $1 AND "status" != 'SUSPENDED';`,
      [payload.sub],
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedException('User account is invalid or suspended');
    }

    return res.rows[0];
  }
}
