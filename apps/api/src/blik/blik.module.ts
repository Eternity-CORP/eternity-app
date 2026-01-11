import { Module } from '@nestjs/common';
import { BlikGateway } from './blik.gateway';

@Module({
  providers: [BlikGateway],
})
export class BlikModule {}
