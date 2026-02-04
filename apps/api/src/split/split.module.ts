import { Module } from '@nestjs/common';
import { SplitService } from './split.service';
import { SplitController } from './split.controller';
import { SplitGateway } from './split.gateway';

@Module({
  imports: [],
  controllers: [SplitController],
  providers: [SplitService, SplitGateway],
  exports: [SplitService],
})
export class SplitModule {}
