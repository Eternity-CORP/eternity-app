import { IsString, Matches, IsNumber, Min } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{2,19}$/, {
    message: 'Username must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, and underscores',
  })
  newUsername: string;

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
