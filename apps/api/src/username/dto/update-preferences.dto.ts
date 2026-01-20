import { IsString, IsNumber, Min, IsObject, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePreferencesDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum address format',
  })
  address: string;

  @IsString()
  signature: string;

  @IsNumber()
  @Min(0)
  timestamp: number;

  /**
   * Token preferences: { [symbol]: networkId | null }
   * Example: { "USDC": "arbitrum", "USDT": null }
   * null means "any network"
   */
  @IsObject()
  tokenPreferences: Record<string, string | null>;
}
