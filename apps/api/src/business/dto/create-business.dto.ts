import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  Matches,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessMemberDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  address: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsNumber()
  @Min(1)
  shares: number;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2,6}$/, { message: 'Symbol must be 2-6 uppercase letters' })
  tokenSymbol: string;

  @IsNumber()
  @Min(2)
  @Max(1000000)
  tokenSupply: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid contract address' })
  contractAddress: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid treasury address' })
  treasuryAddress: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
  factoryTxHash: string;

  @IsString()
  @IsOptional()
  network?: string;

  @IsString()
  @IsNotEmpty()
  transferPolicy: string;

  @IsNumber()
  @Min(5100)
  @Max(10000)
  quorumThreshold: number;

  @IsNumber()
  @Min(3600)
  @Max(2592000)
  votingPeriod: number;

  @IsBoolean()
  vestingEnabled: boolean;

  @IsOptional()
  vestingConfig?: Record<string, unknown>;

  @IsBoolean()
  dividendsEnabled: boolean;

  @IsOptional()
  dividendsConfig?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid creator address' })
  createdBy: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BusinessMemberDto)
  members: BusinessMemberDto[];
}
