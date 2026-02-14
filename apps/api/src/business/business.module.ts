import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessGateway } from './business.gateway';

@Module({
  imports: [],
  controllers: [BusinessController],
  providers: [BusinessService, BusinessGateway],
  exports: [BusinessService],
})
export class BusinessModule {}
