import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('DRIVER', 'ADMIN')
  @Post('payments/checkout/:bookingId')
  async createCheckoutSession(
    @GetUser('id') userId: string,
    @Param('bookingId') bookingId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createCheckoutSession(
      userId,
      bookingId,
      idempotencyKey,
    );
  }

  @Public()
  @Post('webhooks/payments/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}));
    return this.paymentsService.processWebhook(provider, rawBody, headers);
  }
}
