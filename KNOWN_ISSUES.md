# Known Issues & Phase 2 Roadmap — ParkSmart Pakistan

All critical S1 and major S2 defects are **zero**. Below is the list of non-blocking minor items (S3/S4) and future phase recommendations.

---

## 1. Minor Items (S3 / S4)

### Item 1: Real SMS Gateway Integration (S3)
- **Current State**: Uses `ConsoleOtpSender` adapter which logs OTP codes to system output for development and automated e2e testing.
- **Production Recommendation**: Integrate a local Pakistani SMS gateway API (e.g. Jazz, Telenor, Zong, SMSCountry) behind the existing `OtpSender` interface before real production deployment.

### Item 2: Production Payment Gateway Onboarding (S3)
- **Current State**: Uses `MockPaymentProvider` adapter simulating HMAC-SHA256 webhooks, order creation, status polling, and refunds.
- **Production Recommendation**: Plug official Safepay, JazzCash, Easypaisa, or Raast PSP SDKs into the `PaymentProvider` interface once merchant accounts are fully onboarded and approved by SBP (State Bank of Pakistan).

### Item 3: Supabase Free Tier Auto-Pause (S4)
- **Current State**: The Supabase project automatically pauses after 7 days of inactivity on the free tier.
- **Production Recommendation**: Upgrade Supabase to Pro Plan or configure a keep-alive ping for continuous availability.

---

## 2. Phase 2 Future Roadmap (Out of Scope for MVP)
As specified in Section 1 of `docs/MASTER_PROMPT.md`, the following hardware and AI features are intentionally excluded from MVP and deferred to Phase 2:
- IoT Barrier Sensors (ESP32 / MQTT).
- ANPR / Automatic License Plate Recognition cameras.
- Machine Learning Dynamic Pricing & Demand Prediction.
- Multi-currency / Multi-city support outside Pakistan.
