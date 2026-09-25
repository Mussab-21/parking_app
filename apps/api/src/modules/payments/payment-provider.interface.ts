export interface CreateOrderInput {
  bookingId: string;
  amountPaisa: number;
  currency: string;
  idempotencyKey?: string;
}

export interface ProviderEvent {
  providerEventId: string;
  bookingId: string;
  amountPaisa: number;
  currency: string;
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED';
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<{
    providerReference: string;
    checkoutUrl?: string;
    clientPayload?: any;
  }>;
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, any>,
  ): { valid: boolean; event?: ProviderEvent };
  getStatus(
    providerReference: string,
  ): Promise<'PENDING' | 'SUCCEEDED' | 'FAILED'>;
  refund(
    providerReference: string,
    amountPaisa: number,
    idempotencyKey: string,
  ): Promise<{ providerRefundReference: string }>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
