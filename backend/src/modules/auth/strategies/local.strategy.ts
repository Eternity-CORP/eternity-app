import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'walletAddress', passwordField: 'deviceToken' });
  }

  async validate(walletAddress: string, deviceToken: string) {
    return await this.authService.validateUser(walletAddress, deviceToken);
  }
}
