import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { User } from '../../../database/entities/user.entity';
import { UserWallet } from '../../entities/UserWallet.entity';
import { TokenPreference } from '../../entities/TokenPreference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserWallet, TokenPreference])],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
