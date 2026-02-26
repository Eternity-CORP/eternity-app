import {
  IsString,
  IsNotEmpty,
  IsInt,
  Matches,
  Min,
} from 'class-validator';

export class SuggestContactDto {
  @IsString()
  @IsNotEmpty({ message: 'User address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;

  @IsString()
  @IsNotEmpty({ message: 'Recipient address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid recipient Ethereum address' })
  recipientAddress: string;

  @IsInt()
  @Min(0)
  transactionCount: number;
}
