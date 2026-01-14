import { Module } from '@nestjs/common';
import { BlikGateway } from './blik.gateway';
import { BlikService } from './blik.service';

@Module({
  providers: [BlikGateway, BlikService],
  exports: [BlikService],
})
export class BlikModule {}
