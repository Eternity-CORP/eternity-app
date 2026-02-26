import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Matches,
  Min,
} from 'class-validator';

export class LargeTransactionAlertDto {
  @IsString()
  @IsNotEmpty({ message: 'User address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;

  @IsString()
  @IsNotEmpty({ message: 'Transaction hash is required' })
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
  txHash: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsNumber({}, { message: 'USD value must be a number' })
  @Min(0)
  usdValue: number;
}
