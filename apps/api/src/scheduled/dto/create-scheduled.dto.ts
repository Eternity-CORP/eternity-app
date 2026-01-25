import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsDateString,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class CreateScheduledDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid creator address' })
  creatorAddress: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid recipient address' })
  recipient: string;

  @IsString()
  @IsOptional()
  recipientUsername?: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  tokenSymbol: string;

  @IsDateString()
  scheduledAt: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  recurringInterval?: 'daily' | 'weekly' | 'monthly';

  @IsDateString()
  @IsOptional()
  recurringEndDate?: string;

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
