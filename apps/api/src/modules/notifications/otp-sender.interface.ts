export interface OtpSender {
  sendOtp(phone: string, code: string, purpose: string): Promise<void>;
}

export const OTP_SENDER = 'OTP_SENDER';
