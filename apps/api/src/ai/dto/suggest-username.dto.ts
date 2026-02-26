import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class SuggestUsernameDto {
  @IsString()
  @IsNotEmpty({ message: 'User address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  transactionCount?: number;
}
