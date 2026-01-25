import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Matches,
  ValidateIf,
} from 'class-validator';

export class SavePreferencesDto {
  @IsOptional()
  @ValidateIf((o) => o.defaultNetwork !== null)
  @IsString()
  @Matches(/^(ethereum|polygon|arbitrum|base|optimism)$/, {
    message: 'defaultNetwork must be a valid network ID',
  })
  defaultNetwork: string | null;

  @IsObject()
  tokenOverrides: Record<string, string>;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'address must be a valid Ethereum address',
  })
  address: string;

  @IsString()
  signature: string;

  @IsNumber()
  timestamp: number;
}
