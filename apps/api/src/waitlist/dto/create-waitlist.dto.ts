import { IsEmail, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateWaitlistDto {
  @IsEmail()
  email: string;

  @IsBoolean()
  @IsOptional()
  isBetaTester?: boolean;

  @IsString()
  @IsOptional()
  source?: string;
}
