import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/register-device.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Register a device for push notifications
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    const device = await this.notificationsService.registerDevice({
      ...dto,
      walletAddress: dto.walletAddress.toLowerCase(),
    });

    return {
      success: true,
      message: 'Device registered successfully',
      deviceId: device.id,
    };
  }

  /**
   * Unregister a device
   */
  @Post('unregister')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(@Body() dto: UnregisterDeviceDto) {
    await this.notificationsService.unregisterDevice({
      ...dto,
      walletAddress: dto.walletAddress.toLowerCase(),
    });

    return {
      success: true,
      message: 'Device unregistered successfully',
    };
  }
}
