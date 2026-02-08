import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';

@Module({
  imports: [ConfigModule],
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
