import { Injectable, Logger } from '@nestjs/common';
import { OtpSender } from './otp-sender.interface';

@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  async sendOtp(phone: string, code: string, purpose: string): Promise<void> {
    this.logger.log(
      `[OTP CONSOLE SENDER] Phone: ${phone} | Code: ${code} | Purpose: ${purpose}`,
    );
  }
}
