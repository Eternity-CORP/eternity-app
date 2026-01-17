import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  Matches,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipantDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  address: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  amount: string;
}

export class CreateSplitDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  creatorAddress: string;

  @IsString()
  @IsOptional()
  creatorUsername?: string;

  @IsString()
  @IsNotEmpty()
  totalAmount: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  tokenSymbol: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
}
