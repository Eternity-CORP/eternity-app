import { Module, OnModuleInit, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(CrosschainModule.name);

  constructor(
    private readonly crosschainService: CrosschainService,
    private readonly lifiRouter: LifiRouterService,
    private readonly socketRouter: SocketRouterService,
  ) {}

  /**
   * Register routers on module initialization
   */
  onModuleInit() {
    this.logger.log('Registering bridge routers...');

    this.crosschainService.registerRouter(this.lifiRouter);
    this.logger.log('LI.FI router registered (EVM chains)');

    this.crosschainService.registerRouter(this.socketRouter);
    this.logger.log('Socket router registered (EVM + Solana)');

    const routers = this.crosschainService.getAvailableRouters();
    this.logger.log(`${routers.length} routers available: ${routers.join(', ')}`);
  }
}
