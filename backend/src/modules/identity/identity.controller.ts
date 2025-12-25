import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';

class UpdateNicknameDto {
  nickname!: string;
}

class AddWalletDto {
  chainId!: string;
  address!: string;
  isPrimary?: boolean;
  label?: string;
  isActive?: boolean;
}

class UpdateWalletDto {
  chainId?: string;
  address?: string;
  isPrimary?: boolean;
  label?: string;
  isActive?: boolean;
}

class SetTokenPreferenceDto {
  tokenSymbol!: string;
  preferredChainId!: string;
}

class UpdateTokenPreferenceDto {
  tokenSymbol?: string;
  preferredChainId?: string;
}

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.identityService.getProfile(req.user.walletAddress);
  }

  /**
   * Update nickname
   */
  @Put('nickname')
  @UseGuards(JwtAuthGuard)
  async updateNickname(
    @Request() req: any,
    @Body() dto: UpdateNicknameDto
  ) {
    return this.identityService.updateNickname(
      req.user.walletAddress,
      dto.nickname
    );
  }

  /**
   * Get user wallets
   */
  @Get('wallets')
  @UseGuards(JwtAuthGuard)
  async getWallets(@Request() req: any) {
    return this.identityService.getWallets(req.user.walletAddress);
  }

  /**
   * Add wallet
   */
  @Post('wallets')
  @UseGuards(JwtAuthGuard)
  async addWallet(@Request() req: any, @Body() dto: AddWalletDto) {
    return this.identityService.addWallet(
      req.user.walletAddress,
      dto.chainId,
      dto.address,
      dto.isPrimary || false,
      dto.label,
      dto.isActive !== undefined ? dto.isActive : true
    );
  }

  /**
   * Update wallet
   */
  @Put('wallets/:id')
  @UseGuards(JwtAuthGuard)
  async updateWallet(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto
  ) {
    return this.identityService.updateWallet(
      req.user.walletAddress,
      parseInt(id, 10),
      dto
    );
  }

  /**
   * Delete wallet
   */
  @Delete('wallets/:id')
  @UseGuards(JwtAuthGuard)
  async deleteWallet(@Request() req: any, @Param('id') id: string) {
    return this.identityService.deleteWallet(req.user.walletAddress, parseInt(id, 10));
  }

  /**
   * Get token preferences
   */
  @Get('token-preferences')
  @UseGuards(JwtAuthGuard)
  async getTokenPreferences(@Request() req: any) {
    return this.identityService.getTokenPreferences(req.user.walletAddress);
  }

  /**
   * Set token preference
   */
  @Post('token-preferences')
  @UseGuards(JwtAuthGuard)
  async setTokenPreference(
    @Request() req: any,
    @Body() dto: SetTokenPreferenceDto
  ) {
    return this.identityService.setTokenPreference(
      req.user.walletAddress,
      dto.tokenSymbol,
      dto.preferredChainId
    );
  }

  /**
   * Update token preference
   */
  @Put('token-preferences/:id')
  @UseGuards(JwtAuthGuard)
  async updateTokenPreference(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTokenPreferenceDto
  ) {
    return this.identityService.updateTokenPreference(
      req.user.walletAddress,
      parseInt(id, 10),
      dto
    );
  }

  /**
   * Delete token preference
   */
  @Delete('token-preferences/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTokenPreference(@Request() req: any, @Param('id') id: string) {
    return this.identityService.deleteTokenPreference(
      req.user.walletAddress,
      parseInt(id, 10)
    );
  }

  /**
   * Get active wallets only
   */
  @Get('wallets/active')
  @UseGuards(JwtAuthGuard)
  async getActiveWallets(@Request() req: any) {
    return this.identityService.getActiveWallets(req.user.walletAddress);
  }

  /**
   * Get primary chain ID
   */
  @Get('primary-chain')
  @UseGuards(JwtAuthGuard)
  async getPrimaryChain(@Request() req: any) {
    const chainId = await this.identityService.getPrimaryChain(req.user.walletAddress);
    return { primaryChainId: chainId };
  }

  /**
   * Resolve identifier (public endpoint)
   */
  @Get('resolve/:identifier')
  async resolveIdentifier(@Param('identifier') identifier: string) {
    return this.identityService.resolveIdentifier(identifier);
  }
}
