import { IsString, Matches } from 'class-validator';

export class ValidateInviteDto {
  @IsString()
  @Matches(/^[A-Z0-9-]+$/, { message: 'Invalid code format' })
  code: string;

  @IsString()
  fingerprint: string;
}

export class CheckDeviceDto {
  @IsString()
  fingerprint: string;
}
