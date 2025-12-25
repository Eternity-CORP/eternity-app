import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlikController } from '../../controllers/blik.controller';
import { BlikService } from '../../services/Blik.service';
import { IdentityResolverService } from '../../services/IdentityResolver.service';
import { CrosschainService } from '../../services/Crosschain.service';
import { TokenRegistryService } from '../../services/TokenRegistry.service';
import { PaymentRequest } from '../../entities/PaymentRequest.entity';
import { User } from '../../../database/entities/user.entity';
import { UserWallet } from '../../entities/UserWallet.entity';
import { TokenPreference } from '../../entities/TokenPreference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentRequest,
      User,
      UserWallet,
      TokenPreference,
    ]),
  ],
  controllers: [BlikController],
  providers: [
    BlikService,
    IdentityResolverService,
    CrosschainService,
    TokenRegistryService,
  ],
  exports: [BlikService, TokenRegistryService],
})
export class BlikModule {}
