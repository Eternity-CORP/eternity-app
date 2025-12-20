import { Module, OnModuleInit } from '@nestjs/common';
import { CrosschainController } from './crosschain.controller';
import { CrosschainService } from '../../services/Crosschain.service';
import { LifiRouterService } from '../../services/routers/LifiRouter.service';
import { SocketRouterService } from '../../services/routers/SocketRouter.service';

@Module({
  controllers: [CrosschainController],
  providers: [
    CrosschainService,
    LifiRouterService,
    SocketRouterService,
  ],
  exports: [CrosschainService, LifiRouterService],
})
export class CrosschainModule implements OnModuleInit {
  constructor(
    private readonly crosschainService: CrosschainService,
    private readonly lifiRouter: LifiRouterService,
    private readonly socketRouter: SocketRouterService,
  ) {}

  /**
   * Register routers on module initialization
   */
  onModuleInit() {
    console.log('🌉 [Crosschain] Registering bridge routers...');

    this.crosschainService.registerRouter(this.lifiRouter);
    console.log('✅ [Crosschain] LI.FI router registered (EVM chains)');

    this.crosschainService.registerRouter(this.socketRouter);
    console.log('✅ [Crosschain] Socket router registered (EVM + Solana)');

    const routers = this.crosschainService.getAvailableRouters();
    console.log(`🌉 [Crosschain] ${routers.length} routers available: ${routers.join(', ')}`);
  }
}
