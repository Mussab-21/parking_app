import { Module, Global } from '@nestjs/common';
import { ConsoleOtpSender } from './console-otp-sender';
import { OTP_SENDER } from './otp-sender.interface';

@Global()
@Module({
  providers: [
    {
      provide: OTP_SENDER,
      useClass: ConsoleOtpSender,
    },
  ],
  exports: [OTP_SENDER],
})
export class NotificationsModule {}
