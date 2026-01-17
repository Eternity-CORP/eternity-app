import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class MarkPaidDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  participantAddress: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
  txHash: string;
}
