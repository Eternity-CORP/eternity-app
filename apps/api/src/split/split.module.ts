import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplitBill, SplitParticipant } from './entities';
import { SplitService } from './split.service';
import { SplitController } from './split.controller';
import { SplitGateway } from './split.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([SplitBill, SplitParticipant])],
  controllers: [SplitController],
  providers: [SplitService, SplitGateway],
  exports: [SplitService],
})
export class SplitModule {}
