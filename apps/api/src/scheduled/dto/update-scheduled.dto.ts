import {
  IsString,
  IsOptional,
  Matches,
  IsDateString,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class UpdateScheduledDto {
  @IsString()
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid recipient address' })
  recipient?: string;

  @IsString()
  @IsOptional()
  recipientUsername?: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  amount?: string;

  @IsString()
  @IsOptional()
  tokenSymbol?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | null;

  @IsDateString()
  @IsOptional()
  recurringEndDate?: string | null;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  signedTransaction?: string;

  @IsString()
  @IsOptional()
  estimatedGasPrice?: string;

  @IsNumber()
  @IsOptional()
  nonce?: number;

  @IsNumber()
  @IsOptional()
  chainId?: number;
}
