import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`Login attempt - Body: ${JSON.stringify(request.body)}`);

    try {
      const result = await super.canActivate(context);
      this.logger.log(`Login validation passed`);
      return result as boolean;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Login validation failed: ${message}`);
      throw error;
    }
  }
}
