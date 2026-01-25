import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Username } from './username.entity';
import { UsernameService } from './username.service';
import { UsernameController } from './username.controller';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [TypeOrmModule.forFeature([Username]), PreferencesModule],
  controllers: [UsernameController],
  providers: [UsernameService],
  exports: [UsernameService],
})
export class UsernameModule {}
