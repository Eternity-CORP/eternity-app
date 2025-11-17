import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(walletAddress: string, deviceToken: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If user has no device token yet, register this deviceToken on first successful login attempt
    if (!user.encryptedDeviceToken) {
      const hash = await bcrypt.hash(deviceToken, 10);
      user.encryptedDeviceToken = hash;
      await this.userRepo.save(user);
      return user;
    }

    const ok = await bcrypt.compare(deviceToken, user.encryptedDeviceToken);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, walletAddress: user.walletAddress };
    return {
      access_token: await this.jwtService.signAsync(payload)
    };
  }
}
