import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  CreateOrderInput,
  ProviderEvent,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly webhookSecret =
    process.env.WEBHOOK_SECRET || 'mock-webhook-secret';

  async createOrder(input: CreateOrderInput) {
    const providerReference = `MOCK_REF_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const checkoutUrl = `https://checkout.parksmart.pk/mock/${providerReference}`;

    this.logger.log(
      `[MOCK PAYMENT] Order created for booking ${input.bookingId}: ${providerReference}`,
    );

    return {
      providerReference,
      checkoutUrl,
      clientPayload: {
        provider: 'MOCK_PROVIDER',
        providerReference,
        amountPaisa: input.amountPaisa,
        currency: input.currency,
      },
    };
  }

  generateWebhookSignature(payloadString: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadString)
      .digest('hex');
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, any>) {
    const signature = headers['x-mock-signature'] || headers['x-signature'];
    if (!signature) {
      return { valid: false };
    }

    const payloadString = rawBody.toString('utf8');
    const expectedSignature = this.generateWebhookSignature(payloadString);

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    try {
      const body = JSON.parse(payloadString);
      const event: ProviderEvent = {
        providerEventId: body.providerEventId || `EVT_${Date.now()}`,
        bookingId: body.bookingId,
        amountPaisa: body.amountPaisa,
        currency: body.currency || 'PKR',
        providerReference: body.providerReference,
        status: body.status || 'SUCCEEDED',
      };

      return { valid: true, event };
    } catch {
      return { valid: false };
    }
  }

  async getStatus(
    providerReference: string,
  ): Promise<'PENDING' | 'SUCCEEDED' | 'FAILED'> {
    this.logger.log(`[MOCK PAYMENT] Polling status for ${providerReference}`);
    return 'SUCCEEDED';
  }

  async refund(
    providerReference: string,
    amountPaisa: number,
    idempotencyKey: string,
  ) {
    const providerRefundReference = `MOCK_REFUND_${Date.now()}_${idempotencyKey}`;
    this.logger.log(
      `[MOCK PAYMENT] Refund ${amountPaisa} paisa for ${providerReference}: ${providerRefundReference}`,
    );

    return {
      providerRefundReference,
    };
  }
}
