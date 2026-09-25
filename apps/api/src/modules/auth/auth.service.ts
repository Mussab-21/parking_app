import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateSecret, generateURI, verify } = require('otplib');
import { DatabaseService } from '../database/database.service';
import { OTP_SENDER, OtpSender } from '../notifications/otp-sender.interface';
import { RegisterDto, UserRoleDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { ResetPasswordDto, RequestOtpDto } from './dto/reset-password.dto';
import { Verify2FaDto } from './dto/setup-2fa.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
  ) {}

  // Helper: Hash SHA-256
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Helper: Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. REGISTER
  async register(dto: RegisterDto) {
    const existing = await this.db.query(
      `SELECT "id" FROM "users" WHERE "phone" = $1 OR ("email" IS NOT NULL AND "email" = $2);`,
      [dto.phone, dto.email || null],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException(
        'User with this phone or email already exists',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const role = dto.role || UserRoleDto.DRIVER;
    const status = 'PENDING_VERIFICATION';

    const userRes = await this.db.query(
      `INSERT INTO "users" ("name", "phone", "email", "password_hash", "role", "status")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "id", "name", "phone", "email", "role", "status", "created_at";`,
      [dto.name, dto.phone, dto.email || null, passwordHash, role, status],
    );

    const user = userRes.rows[0];

    // Generate & send OTP
    await this.requestOtp(
      { phone: dto.phone, purpose: 'PHONE_VERIFICATION' },
      user.id,
    );

    return {
      message: 'Registration successful. Verification OTP sent.',
      user,
    };
  }

  // 2. REQUEST OTP
  async requestOtp(dto: RequestOtpDto, userId?: string) {
    // Check rate limit: max 3 requests per 10 minutes for this phone
    const rateCheck = await this.db.query(
      `SELECT COUNT(*)::int as count FROM "otp_codes"
       WHERE "phone" = $1 AND "created_at" > NOW() - INTERVAL '10 minutes';`,
      [dto.phone],
    );

    if (rateCheck.rows[0].count >= 3) {
      throw new HttpException(
        'Too many OTP requests. Please wait 10 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otpCode = this.generateOtp();
    const codeHash = this.hashToken(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.db.query(
      `INSERT INTO "otp_codes" ("user_id", "phone", "purpose", "code_hash", "expires_at")
       VALUES ($1, $2, $3, $4, $5);`,
      [userId || null, dto.phone, dto.purpose, codeHash, expiresAt],
    );

    await this.otpSender.sendOtp(dto.phone, otpCode, dto.purpose);

    return { message: 'OTP sent successfully' };
  }

  // 3. VERIFY OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const codeHash = this.hashToken(dto.code);

    const otpRes = await this.db.query(
      `SELECT "id", "user_id", "attempts", "expires_at", "consumed_at"
       FROM "otp_codes"
       WHERE "phone" = $1 AND "purpose" = $2 AND "consumed_at" IS NULL
       ORDER BY "created_at" DESC LIMIT 1;`,
      [dto.phone, dto.purpose],
    );

    if (otpRes.rows.length === 0) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const otp = otpRes.rows[0];

    if (otp.attempts >= 5) {
      throw new BadRequestException(
        'Maximum OTP verification attempts exceeded',
      );
    }

    if (new Date() > new Date(otp.expires_at)) {
      throw new BadRequestException('OTP code has expired');
    }

    // Increment attempts
    await this.db.query(
      `UPDATE "otp_codes" SET "attempts" = "attempts" + 1 WHERE "id" = $1;`,
      [otp.id],
    );

    // Check code hash
    const checkRes = await this.db.query(
      `SELECT "id" FROM "otp_codes" WHERE "id" = $1 AND "code_hash" = $2;`,
      [otp.id, codeHash],
    );

    if (checkRes.rows.length === 0) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Mark consumed
    await this.db.query(
      `UPDATE "otp_codes" SET "consumed_at" = NOW() WHERE "id" = $1;`,
      [otp.id],
    );

    // Update user status
    if (otp.user_id) {
      await this.db.query(
        `UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "id" = $1;`,
        [otp.user_id],
      );
    } else {
      await this.db.query(
        `UPDATE "users" SET "phone_verified_at" = NOW(), "status" = 'ACTIVE' WHERE "phone" = $1;`,
        [dto.phone],
      );
    }

    return { message: 'Phone verification successful' };
  }

  // 4. LOGIN
  async login(dto: LoginDto, ip?: string) {
    const userRes = await this.db.query(
      `SELECT "id", "name", "phone", "email", "password_hash", "role", "status",
              "failed_login_count", "locked_until", "totp_secret_enc"
       FROM "users"
       WHERE "phone" = $1 OR ("email" IS NOT NULL AND "email" = $1);`,
      [dto.identifier],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = userRes.rows[0];

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account suspended');
    }

    // Lockout check
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      throw new HttpException(
        'Account locked due to multiple failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verify password with Argon2id
    const validPassword = await argon2.verify(user.password_hash, dto.password);

    if (!validPassword) {
      const newFailCount = user.failed_login_count + 1;
      let lockedUntil: Date | null = null;

      if (newFailCount >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 mins
      }

      await this.db.query(
        `UPDATE "users" SET "failed_login_count" = $1, "locked_until" = $2 WHERE "id" = $3;`,
        [newFailCount, lockedUntil, user.id],
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check TOTP 2FA for ADMIN
    if (user.role === 'ADMIN' && user.totp_secret_enc) {
      if (!dto.totpCode) {
        return {
          requires2FA: true,
          message: 'Admin account requires TOTP 2FA code',
        };
      }

      const verified = await verify({
        token: dto.totpCode,
        secret: user.totp_secret_enc,
      });
      if (!verified) {
        throw new UnauthorizedException('Invalid TOTP 2FA code');
      }
    }

    // Reset lockout counters
    await this.db.query(
      `UPDATE "users" SET "failed_login_count" = 0, "locked_until" = NULL WHERE "id" = $1;`,
      [user.id],
    );

    // Generate tokens
    return this.createTokenPair(user, ip);
  }

  // Helper: Create Access & Refresh token pair
  private async createTokenPair(user: any, ip?: string) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.db.query(
      `INSERT INTO "refresh_tokens" ("user_id", "token_hash", "family_id", "created_ip", "expires_at")
       VALUES ($1, $2, $3, $4, $5);`,
      [user.id, tokenHash, familyId, ip || null, expiresAt],
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  // 5. REFRESH TOKEN ROTATION & REUSE DETECTION
  async refresh(dto: RefreshTokenDto, ip?: string) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const tokenRes = await this.db.query(
      `SELECT "id", "user_id", "family_id", "expires_at", "revoked_at"
       FROM "refresh_tokens"
       WHERE "token_hash" = $1;`,
      [tokenHash],
    );

    if (tokenRes.rows.length === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const token = tokenRes.rows[0];

    // REUSE DETECTION: If token was already revoked, revoke ENTIRE family!
    if (token.revoked_at !== null) {
      this.logger.warn(
        `Refresh token reuse detected for family ${token.family_id}! Revoking family.`,
      );
      await this.db.query(
        `UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "family_id" = $1;`,
        [token.family_id],
      );
      throw new UnauthorizedException('Invalid refresh token (reuse detected)');
    }

    // Check expiration
    if (new Date() > new Date(token.expires_at)) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Load user
    const userRes = await this.db.query(
      `SELECT "id", "name", "phone", "email", "role", "status" FROM "users" WHERE "id" = $1;`,
      [token.user_id],
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status === 'SUSPENDED') {
      throw new UnauthorizedException('User inactive or suspended');
    }

    const user = userRes.rows[0];

    // Revoke current token and generate new token under SAME family_id
    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newTokenRes = await this.db.query(
      `INSERT INTO "refresh_tokens" ("user_id", "token_hash", "family_id", "created_ip", "expires_at")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING "id";`,
      [user.id, newTokenHash, token.family_id, ip || null, newExpiresAt],
    );

    const newTokenId = newTokenRes.rows[0].id;

    // Mark old token revoked and replaced
    await this.db.query(
      `UPDATE "refresh_tokens" SET "revoked_at" = NOW(), "replaced_by" = $1 WHERE "id" = $2;`,
      [newTokenId, token.id],
    );

    // Sign new access token
    const accessToken = this.jwtService.sign(
      { sub: user.id, phone: user.phone, role: user.role, status: user.status },
      { expiresIn: '15m' },
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user,
    };
  }

  // 6. LOGOUT
  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    await this.db.query(
      `UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "token_hash" = $1;`,
      [tokenHash],
    );
    return { message: 'Logged out successfully' };
  }

  // 7. RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    await this.verifyOtp({
      phone: dto.phone,
      code: dto.code,
      purpose: 'PASSWORD_RESET',
    });

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    const userRes = await this.db.query(
      `UPDATE "users" SET "password_hash" = $1 WHERE "phone" = $2 RETURNING "id";`,
      [passwordHash, dto.phone],
    );

    if (userRes.rows.length === 0) {
      throw new BadRequestException('User not found');
    }

    const userId = userRes.rows[0].id;

    // Invalidate all refresh tokens for this user
    await this.db.query(
      `UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "user_id" = $1;`,
      [userId],
    );

    return {
      message:
        'Password reset successful. Please log in with your new password.',
    };
  }

  // 8. SETUP 2FA (ADMIN)
  async setup2Fa(userId: string) {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'ParkSmart',
      label: userId,
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Temporarily save secret
    await this.db.query(
      `UPDATE "users" SET "totp_secret_enc" = $1 WHERE "id" = $2;`,
      [secret, userId],
    );

    return { secret, qrCodeDataUrl };
  }

  // 9. VERIFY 2FA (ADMIN)
  async verify2Fa(userId: string, dto: Verify2FaDto) {
    const userRes = await this.db.query(
      `SELECT "totp_secret_enc" FROM "users" WHERE "id" = $1;`,
      [userId],
    );
    const secret = userRes.rows[0]?.totp_secret_enc;

    if (!secret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const verified = await verify({ token: dto.totpCode, secret });
    if (!verified) {
      throw new BadRequestException('Invalid TOTP code');
    }

    return { message: '2FA enabled successfully' };
  }
}
