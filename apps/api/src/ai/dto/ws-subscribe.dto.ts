import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';

/**
 * DTO for the WebSocket AI subscribe event.
 * Validates the address, optional contacts array, and account type.
 */
export class WsSubscribeDto {
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/i, {
    message: 'Address must be a valid hex address (0x + 40 hex characters)',
  })
  address: string;

  @IsOptional()
  @IsArray()
  contacts?: Array<{ address: string; name?: string; username?: string }>;

  @IsOptional()
  @IsString()
  @IsIn(['test', 'real'], {
    message: 'accountType must be one of: test, real',
  })
  accountType?: 'test' | 'real';
}
