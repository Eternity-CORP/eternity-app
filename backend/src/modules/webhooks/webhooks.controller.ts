import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly configService: ConfigService) {}

  @Post('alchemy')
  handleAlchemyWebhook(@Req() req: any, @Headers('X-Alchemy-Signature') signature?: string) {
    const secret = this.configService.get<string>('alchemyWebhookSecret');
    if (!secret) throw new BadRequestException('Missing webhook secret');

    const payload = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expected) {
      throw new BadRequestException('Invalid signature');
    }

    // TODO: process events with retry mechanisms / queueing
    return { ok: true };
  }
}
