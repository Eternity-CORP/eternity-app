import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsObject,
  Matches,
  MaxLength,
} from 'class-validator';

export class SecurityAlertDto {
  @IsString()
  @IsNotEmpty({ message: 'User address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['new_device', 'failed_auth', 'unusual_activity'], {
    message: 'alertType must be one of: new_device, failed_auth, unusual_activity',
  })
  alertType: 'new_device' | 'failed_auth' | 'unusual_activity';

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
