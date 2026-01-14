import { IsString, Matches, IsNumber, Min } from 'class-validator';

export class DeleteUsernameDto {
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
}
