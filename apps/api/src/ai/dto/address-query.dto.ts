import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * DTO for endpoints that accept a wallet address as a query parameter.
 * Used by: GET /ai/rate-limit, GET /ai/suggestions
 */
export class AddressQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Address query parameter is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  address: string;
}
