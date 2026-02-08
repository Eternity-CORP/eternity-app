import { IsString, Matches } from 'class-validator';

export class ClaimFaucetDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  address: string;
}
