import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressPreferences } from './entities/address-preferences.entity';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AddressPreferences])],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
