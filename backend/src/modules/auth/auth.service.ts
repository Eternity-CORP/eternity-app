import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(walletAddress: string, deviceToken: string): Promise<User> {
    this.logger.log(`Validating user: ${walletAddress}, deviceToken length: ${deviceToken?.length || 0}`);
    // Normalize wallet address to lowercase for case-insensitive comparison
    const normalizedAddress = walletAddress.toLowerCase();
    const user = await this.userRepo.findOne({ where: { walletAddress: normalizedAddress } });
    if (!user) {
      this.logger.warn(`User not found for wallet: ${walletAddress}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User found: ${user.id}, has deviceToken: ${!!user.encryptedDeviceToken}`);

    // If user has no device token yet, register this deviceToken on first successful login attempt
    if (!user.encryptedDeviceToken) {
      this.logger.log(`First login - registering device token`);
      const hash = await bcrypt.hash(deviceToken, 10);
      user.encryptedDeviceToken = hash;
      await this.userRepo.save(user);
      this.logger.log(`Device token registered successfully`);
      return user;
    }

    const ok = await bcrypt.compare(deviceToken, user.encryptedDeviceToken);
    if (!ok) {
      this.logger.warn(`Device token mismatch for user: ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Device token verified successfully`);
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, walletAddress: user.walletAddress };
    return {
      access_token: await this.jwtService.signAsync(payload)
    };
  }
}
