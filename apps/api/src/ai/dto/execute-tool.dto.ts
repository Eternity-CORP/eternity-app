import {
  IsString,
  IsNotEmpty,
  IsObject,
  Matches,
  MaxLength,
} from 'class-validator';

export class ExecuteToolDto {
  @IsString()
  @IsNotEmpty({ message: 'Tool name is required' })
  @MaxLength(100)
  tool: string;

  @IsObject({ message: 'Tool arguments must be an object' })
  args: Record<string, unknown>;

  @IsString()
  @IsNotEmpty({ message: 'User address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;
}
