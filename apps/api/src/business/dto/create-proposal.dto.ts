import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProposalDto {
  @IsNumber()
  @Min(0)
  onChainId: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid creator address' })
  createdBy: string;
}
