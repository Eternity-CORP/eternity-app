import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Username } from './username.entity';
import { UsernameService } from './username.service';
import { UsernameController } from './username.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Username])],
  controllers: [UsernameController],
  providers: [UsernameService],
  exports: [UsernameService],
})
export class UsernameModule {}
