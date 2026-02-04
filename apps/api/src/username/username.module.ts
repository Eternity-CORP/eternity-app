import { Module } from '@nestjs/common';
import { UsernameService } from './username.service';
import { UsernameController } from './username.controller';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [PreferencesModule],
  controllers: [UsernameController],
  providers: [UsernameService],
  exports: [UsernameService],
})
export class UsernameModule {}
