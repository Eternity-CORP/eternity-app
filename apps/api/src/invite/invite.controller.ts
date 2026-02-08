import { Controller, Post, Get, Body, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { InviteService } from './invite.service';
import { ValidateInviteDto, CheckDeviceDto } from './dto/validate-invite.dto';
import { Request } from 'express';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('validate')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async validate(@Body() dto: ValidateInviteDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.inviteService.validate(dto.code, dto.fingerprint, ip);
  }

  @Post('check-device')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async checkDevice(@Body() dto: CheckDeviceDto) {
    return this.inviteService.checkDevice(dto.fingerprint);
  }

  @Get('status')
  async getStatus() {
    return this.inviteService.getStatus();
  }
}
