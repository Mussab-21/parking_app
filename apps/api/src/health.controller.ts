import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller('api/v1/health')
export class HealthController {
  @Public()
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'ParkSmart API',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  checkLiveness() {
    return {
      status: 'live',
      service: 'ParkSmart API',
      timestamp: new Date().toISOString(),
    };
  }
}
